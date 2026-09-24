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

## 12. AUP 运行期实测（首次用真实浏览器验证）

`dsh-builtin-browser` 插件装上后，第一次不再靠推测而是**真机**核对了这些行为：

| 事实 | 证据 |
|---|---|
| `dsl generate` **不生成** `wrapper.*` 的 locale key | 删掉官方 `code-agents` blocklet 的 locales 再 `generate`，wrapper key 仍为空；它那些 key 是手工维护的 |
| `dsl generate` 对 locale 文件是**合并**语义 | 手工补的 `wrapper.*` 在后续多次 `generate` 中保留下来（正因如此旧的 `wrapper.nav-posts` 残留了很久） |
| wrapper 必须用 `:key` 引用（`label: :nav-about`） | 写成字面量 `label: "$t(wrapper.nav-about)"` 时，编译结果相同但 generate 不注册 key → 页脚渲染出字面量 `$t(wrapper.nav-author)`（**本次修掉的真 bug**） |
| `$t(page.key)` 运行时由 **daemon 编译进 app bundle**，不是 HTTP 取 locale 文件 | `/.aup/locales/zh.json` 返回的是 AUP 外壳 HTML（root 路径被 AUP 接管，§7）→ 改文案必须重启 daemon |
| `${state.a.b.c}` **深层取值可用** | Dashboard 角色卡用 `propBind` + `${state.roles.studio.collectionAddress}` 正常渲染 |
| `<time mode=display value="..." timeMode=relative>` 可用 | 健康/发现卡显示 `5 minutes ago` |
| `visible` 对 **propBind 异步数据不可靠** | `visible="!$state.health.status"` 在数据到达前求值 → 提示恒显、时间恒隐（本次修掉的 bug） |
| `visible=$session.authenticated` **可靠** | 用它把管理员专属列表对访客隐藏，已验证 |
| afs-list 的 `emptyText` 在**目录缺失**时不生效，且 `empty`/`error` 事件不触发 | 平台仍渲染自己的英文 `aup-list-empty: No items to display`；`emptyText` 用 `:key` 或字面量都一样 |
| 遍历目录会把**子目录**也当记录渲染 | `/config` 下有 `trusted-hubs/`，Dashboard 角色卡因此多渲染一行空值（标签重复）；改为 `propBind` 单文件读取 |

## 13. 权限模型实测（`networkRead` vs `replicated`）

权限分三层：**页面可见性**（AUP DSL）、**资源读写**（blocklet.yaml）、**UI 入口**（按钮指向哪）。

### 权威来源是 `replicated.<collection>.readRole` / `minRole`
实测：把 `networkRead` 的 `config` 从 `guest` 改成 `admin`，构建 + `instance deploy` +
`arc service restart` 之后，访客**仍然**能列出 `config/` 并读到 `config/roles.json` —— 因为同名的
`replicated.config` 仍写着 `readRole: guest`。改成 `admin` 后才真正生效。

### `networkRead` 是**前缀增补**（PREFIX grant），不能收回权限
ARC 自带示例里的权威注释（`assets/blocklets/launch-kit/blocklet.yaml:164`）：

> `networkRead` is a PREFIX grant … the whole tree is deliberately gated at `admin` …
> never by widening this prefix to guest
> Separate two-segment prefix `instance/wall` (**NOT under** `instance/campaigns`)

### 父前缀 guest 会泄漏子目录的"列目录"
只要 `config` 前缀对 guest 开放，访客就能 `list(/config/agent-grants)` 拿到 admin-only 记录的
**文件名 / 路径 / 时间**（内容读取被正确拒绝）。子集合的规则匹配其**内部**（`…/agent-grants/*`），
**不匹配目录本身**。→ 公开子树必须放在**另一个顶层前缀**，绝不嵌在私有父目录下。

### 未声明路径默认**拒绝**
`Forbidden: path is not a declared replicated collection; network reads are not permitted here`。
（唯一观察到的例外：`/instance/settings/arcblog/*` 访客可读 —— 平台自己的设置面，未在本清单声明。）

### 收紧后的访客矩阵（浏览器内 `window.afs` 实测）
| 路径 | 声明角色 | 访客 |
|---|---|---|
| `posts` / `heroes` / `node` / `categories` | guest | ✅ ALLOWED |
| `economy/policies` / `economy/products` | guest | ✅ ALLOWED |
| `drafts` / `media` / `config`（整树）/ `hub` | admin | ⛔ DENIED |
| `economy/{orders,settlements,ledger,access-grants,attributions}` | admin | ⛔ DENIED |
| 未声明路径 | — | ⛔ DENIED |

### 自动化守卫
`scripts/arcblog-permissions.test.mjs` 以**无 cookie 的访客身份**请求 `POST /api/afs/rpc`
（200=放行 / 404 AFS_NOT_FOUND=放行但路径不存在 / 403=拒绝），把上面的矩阵固定下来；
拒绝断言必须匹配 `below readRole`，因此拼错或未声明的路径（回答
"not a declared replicated collection"）不会伪装成"已正确授权"。
回归验证：把 `config.readRole` 注入为 guest，源真相守卫与派生一致性检查会立即失败。

### 页面与菜单
- **页面**：`blocklet.yaml` 的 `sites[].bindings[]` **没有** role 字段（在 ARC 全部官方 blocklet 里核对过，
  也没有顶层 `navigation`/`menu`/`permissions` 键）。授权靠 AUP：内容包在 `view visible=$session.authenticated`，
  再放一张 `visible="!$session.authenticated"` 的登录卡：
  `action -> navigate "/.well-known/service/login?return_to=%2F%3Fpage%3Dsettings&cancel_to=…"`。
- **菜单**：定义在 `wrapper.aup`（`app-header actions=[{kind: user-menu, items: […]}]`）。官方示例的菜单项只有
  `{id,label,src,href}`，**没有角色字段**；未登录时平台用登录按钮替代整个 user-menu。要按权限显示自定义菜单，
  只能用 `view visible=…` 包一层自定义导航。

## 14. Web Device 组件与 `frame` 实测（首页 hero 轮播）

首页原本用 `afs-list layout=slideshow` —— 该布局**没有自动播放**（我把它的 33 个 prop 全枚举过，
无任何计时属性）。改走"自定义组件 + `frame`"路线后，实测出这些事实：

| 事实 | 证据 |
|---|---|
| 组件的 `script.js` 会被**内联进 SSR 页面** | `/p/en/theme-bridge/` 的 HTML 里含 7,767 字符内联脚本；hero-carousel 的内联 32,766 字符 |
| 根相对静态资源会被 AUP 吞掉，**不能用** | `/assets/js/*`、`/aup-ssr.<hash>.js` 均返回 AUP 外壳 HTML；`/p/CLAUDE.md` 404 |
| 页面目录下的文件**不会**当静态资源提供 | 把 `photo-story.js` 放进 `pages/hero-carousel/` 后请求 `/p/en/hero-carousel/photo-story.js` 返回页面 HTML |
| `frame` **没有 `style` 属性** | 其 props 为 `src/bridge/overlay/loading/size/fallback/autoHeight*/aspectRatio/allow/sandbox/transparent/title/variant`；我传的 `style` 被安全样式白名单丢弃，iframe 保持默认 200px |
| `frame` 的 `autoHeight` **未生效** | 子文档 `body.scrollHeight=900`，父级 iframe 仍为 200px；改用 `aspectRatio="16 / 7"` 后正常（1134→496px） |
| `window.afs.tryList(path)` **只返回元数据** | 条目无 `content` 字段；需 `tryList(path, { includeContent: true })` 才带内容（`includeContent` 在运行时里出现 13 次） |
| `frame` 默认给 iframe 加 `sandbox="allow-scripts allow-forms allow-popups allow-same-origin"` | 该列表**没有 top-navigation**，所以组件内 `target="_parent"` 的 CTA 点击**被浏览器静默拦截**。`sandbox` 属性可传字符串：运行时以 `allow-scripts allow-forms allow-popups` 为基列表，再附加字符串里合法的 token（`allow-top-navigation-by-user-activation` 等在白名单内）。首页 hero 用 `sandbox="allow-top-navigation-by-user-activation"`，点击"阅读全文"才会真正跳转；同源 src 会自动补 `allow-same-origin`，`sandbox=false` 在同源时直接不写该属性 |
| 引擎在 slideshow/autoplay 模式把**内联样式**写到活动幻灯片 | `style.alignItems="center"; style.justifyContent="center"` —— 要改排版必须 `!important` |
| `prefers-reduced-motion: reduce` 会影响体验 | 自动化 Chromium 报告 reduce；组件据此退化为手动轮播（`mode=slideshow`），实测 `reducedMotion: false` 时为 `autoplay` 且 `advanced: true` |

组件契约（`.web/components/<name>/`）：`component.dsl`（`script` 关键字声明客户端脚本）、
`manifest.json`（`hasScript: true`）、`render.js`（`export function render(ctx)` → `{html}`，
`ctx` 提供 `props`/`escapeHtml`）、`script.js`、`style.css`；页面在 `pages/<name>/layout.aup` 里
写 `<name> slot=main`，随后用 `frame src="/p/en/<name>/"` 嵌入 AUP 页面。

## 14b. `app-header` 品牌（logo）的两个字段与 `nav-click`

`app-header` 的 `brand` 有两个容易混用的字段：

| 字段 | 作用 |
|---|---|
| `logo` | **图片地址**（渲染 `<img class="aup-app-header-logo">`） |
| `href` | 写成字符串 → 渲染成真正的 `<a href>`，点击即跳转（页脚品牌用的就是这种） |
| `src` | **点击目标**：无 `href` 时运行时渲染成 `<button role=link>`，点击时发 `nav-click` 事件，payload 为 `{id: null, src: <src>, href: null}` |

因此 `brand={title: ArcBlog, src: posts}` 而**没有**声明 `events={nav-click: …}` 时，每次点击都会弹
`Node 'site-header' has no 'nav-click' event`（实测复现）。两种修法：补上处理器
（`nav-click: {target: _root, set: {page: $args.src}}`，应用内切换页面）或改用 `href`（整页导航）。
首页 hero 的 CTA 也踩过同类坑（`frame` sandbox 拦 top-navigation，§14）。

## 15. 列表筛选、查询索引与异步 `visible`（首页/正文页实测）

### 15.1 `filter` / `serverFilters` 会下推成服务端查询

`afs-list` 的 `filter={field: "content.status", match: published}` 与分类 chips 都会编译成
`where` 下推，运行时会调用 `/.actions/query`（捕获到的真实负载：
`{"path":"/instance/app/arcblog/posts","skipTotal":true,"where":{"eq":"technology","field":"category"}}`）。
字段本身可查（`category`/`slug`/`title`/`summary`/`status` 实测都能匹配），**但查询只覆盖索引里的记录**：

| 记录 | 来源 | `where` 能否查到 |
|---|---|---|
| `probe-post.json` | CLI 新建（新路径） | ✅ |
| `index-probe.json` | CLI 新建（新路径） | ✅ |
| `hello-arcblog.json` | 既有记录（被 `publish --update` 改写过） | ❌ 删除+重建、改内容、`/modules/index` 的 `index`/`reindex`/`cleanup` 都无效 |

另一条更硬的边界：**索引只覆盖"小"记录**。受控实验（同一目录、同一 CLI 写入）：

| 记录正文体积 | `where` 能否命中 |
|---|---|
| ~50 B（`probe-a`/`probe-b`） | ✅ |
| 789 B（`probe-k`） | ✅ |
| 2.5 KB（`probe-mid`） | ❌ |
| 4.9 KB（示例文章正文 3.7 KB markdown） | ❌ |

所以带正常正文的文章**不会**出现在 provider 查询结果里（同一目录下不带 `where` 的查询/回退列表仍能看到它们）。
这直接影响 `scripts/arcblog-query-posts.mjs`（走 provider 查询）与任何 `filter`/chips。
因此 `scripts/arcblog-query-posts.test.mjs` 现在自带一条**小正文 fixture** 来验证下推路径，
不再依赖实例里恰好存在的可查询数据。

结论：**编辑既有记录会让它的索引条目变 stale（不再被 `where` 命中），只有新路径才会重新入索引**。
`/modules/index/.actions/verify` 显示 480 条中 477 条是 stale；`cleanup` 清掉它们也不恢复被改写记录的可见性。
因此任何依赖 `filter` 的列表（首页 feed、工作室快速添加、operations 的 discovery/policy、
以及分类 chips）都会**静默丢记录**。

采用的修法（都不依赖索引）：
- 首页 feed 与工作室快速添加：**去掉 `filter`**，改由目录边界保证语义（`posts/` 只放已发布，`drafts/` 私有）。
- operations 的 discovery / policy：改为 **`propBind` 单记录读取**（`node/discovery.json`、`economy/policies/active.json`）。
- 分类 chips 暂时移除：下推查询会漏掉索引失效的记录，宁可没有筛选也不要静默少文章。

### 15.2 异步 `propBind` 数据上的 `visible` 必须用插值形式

正文页封面原本写 `visible="$state.post.coverImage"`：记录异步到达后**元素始终不出现**
（DOM 里根本没有 `reader-cover`），而同一层的 `visible="$state.post"` 却能正常翻转。
改为插值形式 `visible="${state.post.coverImage}"` 后立即渲染（1136×280）。
规则：**异步数据上的 `visible` 用 `${state.x.y}`，不要用 `$state.x.y`。**

### 15.3 其他

- `arc afs ls/read/write` 在根作用域看不到 `/instance/...`；读 instance 路径要用
  `arc afs exec /blocklets/arcblog/.actions/{list,read,write,delete}`。
- `afs-list` 的 row 会给直接子元素加 `flex: 1 1 0%`，只看 `flexShrink: 0` 挡不住拉伸：
  固定尺寸的封面要同时写 `flexGrow: 0` + `flexBasis`。
- `autoSelect=false` 可避免列表首项被标记为选中（否则第一张卡片会带选中底色）。

## 16. 管理控制台的信息架构：按功能分页 + 分组侧栏（实测）

需求演化：先把用户菜单里 3 个自定义入口合成 1 个（进入控制台），管理页改左右布局；再"拆分页面、
菜单按功能分组"，避免单页承担过多功能。落地结论：

| 事实 | 说明 |
|---|---|
| DSL **没有**片段/包含 primitive | `arc dsl schema` 的 primitive 里没有 fragment/include/component/partial/slot/macro；页面之间无法复用标记 |
| 表达式**不支持比较** | 只有 `\|\|`/`&&`/`!` over `$session.*`/`$state.*`；无法按"当前页"条件渲染侧栏或高亮，当前项只能**每页硬编码** `variant=primary` |
| 于是外壳是**生成**的 | 菜单模型在 `scripts/console-nav.mjs`；`node scripts/arcblog-console-nav.mjs` 把侧栏写进 6 个控制台页，`--check` 由 `scripts/arcblog-console-nav.test.mjs` 守住（缺项/漂移会点名页面）。AUP 无 include，"生成 + 守卫"是让菜单只定义一次的可行做法 |
| 菜单分 3 组 | 内容（仪表盘 / 工作室 / Hero 与分类）、运营（运维 / 媒体与 Agent）、经济（策略与授权）；分组标题写作 `p "$t(wrapper.nav-group-*)" scale=caption intent=muted` |
| 标签来自 wrapper 命名空间 | 页面**可以**引用 `$t(wrapper.*)`（与页面作用域 i18n 不同），所以 6 个页面共用同一份文案，只在 `wrapper.aup` + `.aup/locales/*.json` 里维护一次 |
| 拆分结果 | `admin` 194→97 行（只留文章：工作室头部/生命周期/外观 + 已发布 + 草稿）；`operations` 165→89 行（只留节点与网络：健康/发现/Hub）；新增 `heroes-admin`（Hero + 分类）、`ops-admin`（媒体索引 + Agent 授权）、`economy-admin`（策略/商品/访问授权）；`dashboard` 瘦身为落地页（节点 + 最近发布 + 快捷操作），同时清掉 14 个因此变成死键的页面 i18n |
| 用户菜单只留 1 项 | `user-menu items=[{id: console, label: :nav-console, icon: "grid", exec: "dashboard"}]` |
| **locale 文件是扁平点号键** | 必须写 `"wrapper.nav-console"`；写成嵌套 `{"wrapper": {...}}` 时 `generate` 会保留但运行时读不到，菜单显示字面量 `$t(wrapper.nav-console)`（踩过） |
| 几何验证 | 侧栏 `210px @x=32`、内容 `896px @x=272`（242 ≤ 272）⇒ 并排而非堆叠；6 个页面各有一个 `variant=primary` 当前项 |

维护流程：

1. 改菜单 → 改 `scripts/console-nav.mjs` → `node scripts/arcblog-console-nav.mjs` → `arc dsl generate --write`
   → `arc blocklet build` → `arc service restart`；
2. 新增控制台页 → 先加到模型，页面里放 `row console-shell`（`--check` 会要求它带完整菜单 + 恰好一个当前项）；
3. 侧栏文案 → 在 `wrapper.aup` 的 i18n 与 `.aup/locales/{en,zh}.json`（**扁平键**）里各加一条，
   `scripts/arcblog-i18n.test.mjs` 会检查"每个 wrapper 键都被引用、每个引用都有 en/zh"。


## 17. 主题闪烁：`data-mode` 重置 + 桥接 iframe 重建（实测）

现象：点菜单切换控制台页面时，先闪一下深色，再变回明亮（约 250–350ms）。

实测时间线（真实 Chrome，`MutationObserver` + rAF 采样；系统明亮主题，站点设置 `theme=system`）：

| 时刻 | 事件 |
|---|---|
| t≈30ms | AUP 运行期在导航渲染时把 `<html data-mode>` **重置为编译默认值**；`.aup/app.aup` 未声明 `mode` 时该值为 `dark` |
| t≈35ms | 旧桥接 iframe 被移除、新桥接 iframe 挂上（导航必然重建这个 frame） |
| t≈70→314ms | 主线程被导航后的渲染占满（244ms 内 0 个 rAF 帧），iframe 的文档解析与内联脚本只能排队 |
| t≈330–430ms | 新 iframe 的脚本终于执行，解析出 `system→light` 并写回 `data-mode=light` |

**闪烁窗口 = 运行期重置到桥接 iframe 真正跑起来之间的主线程占用。** 三条平台限制（均已实测，别再试图绕）：

1. **AUP 没有宿主脚本注入 primitive**：63 个 primitive 里没有 `script`/`html`/`raw`/`slot`，改 `<html>` 属性只能靠桥接 iframe——这正是 theme-bridge 存在的原因。
2. **导航必然重建桥接 iframe**：给 iframe 的 `contentWindow` 打标记，导航后标记消失（`sameElement:false`）。
3. **iframe 的 MutationObserver 随 iframe 一起死**：即使它 observe 的是父文档，移除 iframe 后回调不再触发（实测 `survived:false`），所以"让旧实例顺手补一刀"行不通。

已做的优化（由 `scripts/arcblog-theme.test.mjs` 守住）：

- **桥接侧**：解析结果写进父窗口 `localStorage['arcblog:theme:v1']`，新 iframe **一启动就同步回放缓存**（`applyCached`），不再等 3 次 `afs.read`；boot 重试间隔 250ms→30ms。这样"桥接开始执行 → 主题正确"落在同一个 tick。
- **编译侧**：`.aup/app.aup` 声明 `mode light`，让运行期自己的默认值等于本站当前外观，于是对明亮访客**完全没有闪烁**。

代价与选择：`mode` 只接受 `light`/`dark`（`mode must be "light" or "dark"`，**不接受 `system`**），所以：

| 站点默认 `theme` | 编译 `mode` | 结果 |
|---|---|---|
| `system` | 未声明（运行期默认 `dark`） | 明亮访客每次导航闪深色（原始 bug） |
| `system` | `light` | 明亮访客不闪；深色访客每次导航闪浅色（当前配置） |
| `light` | `light` | **默认访客都不闪**；手动切到深色的用户会闪 |
| `dark` | `dark` | **默认访客都不闪**；手动切到浅色的用户会闪 |

想让所有默认访客都不闪，就把站点默认设成**固定**外观并与编译 `mode` 一致；保留 `system` 自适应，就必然有一半访客（系统偏好与编译值相反）看到闪烁——这是当前架构的硬边界。
