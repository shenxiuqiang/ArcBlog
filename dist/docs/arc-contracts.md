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
  dir: /Users/shenxiuqiang/workspace/ArcBlog
  AUP pages: about, admin, author, compose, compose-edit, dashboard, economy-admin, heroes-admin, index, operations, ops-admin, preview, reader, settings
  web sections: 0
  agents: 1
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
`economy-products` 可写；`economy-orders`/`settlements`/`ledger`/`refunds`/`attributions`/`access-grants` 与整棵 `config`、`hub`
连读都是 admin-only（含买家与读者身份）。

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
| `dsl generate` 对 locale 文件是**合并**语义 | 手工补的 `wrapper.*` 在后续多次 `generate` 中保留下来（正因如此旧的 `wrapper.nav-posts` 残留了很久）；**只追加、从不清理**，死键因此永久堆积（见 §18） |
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

因此 `brand={title: ArcBlog, src: index}` 而**没有**声明 `events={nav-click: …}` 时，每次点击都会弹
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

## 18. locale 文件的真实生命周期：生成 / 只追加 / 死键（实测）

`.aup/locales/*.json` 看起来像手写源文件，实际 **96% 是 `arc dsl generate` 的产物**；不搞清楚这一点就会一直问"为什么文案写在 `.aup` 里而不是 locales 里"。

| 事实 | 证据 |
|---|---|
| **页面 `i18n {}` 块是源，locale 是产物** | 在 `/tmp` 副本给 settings 页加一条 `probe-new { en "…" zh "…" }` → `generate` 只改 `.aup/locales/{en,zh}.json`，产出 `"settings.probe-new"`。`arc dsl generate --help` 只说生成 app.json/pages，但它管的其实是 21 个文件（含 locales） |
| **键是页面作用域** | `title` 在 settings / compose / compose-edit / reader 都存在 → 扁平键必须带页前缀（`compose.f-title`），前缀由 generate 按页面自动给出；这也是"跨页不能引用 `:key`"的由来 |
| **写入是合并/追加，不重写不清理** | 现有键的位置保留，新键追加到文件末尾（实测新键落在第 318 行）；删页面/改命名空间后旧键永久残留——本轮从 316 个键里清出 **78 个死键** |
| **`wrapper.*` 是唯一手写部分** | generate 不产出 wrapper 键（§12 已证）；`wrapper.aup` 的 `:key` 只编译出 `$t(wrapper.x)`，字符串必须手写进 locales（14 个键） |
| **引用方式决定键是否被生成** | `label=:key` 会注册进 i18n 表；字面量 `$t(page.key)` 只是普通字符串。本轮修掉的 9 个"被引用但无声明"的键就是后者：4 个 `admin.*-ok` toast（本来手写在 locales 里）+ 5 个 heroes-admin 页面里写死的 `$t(admin.hero-*)` / `$t(admin.cat-*)`（页面拆分前的命名空间）→ 现改为在**所属页**的 `i18n {}` 块声明，于是全部转为生成物 |
| **运行时不是 HTTP 取 locale** | AUP 是 WebSocket 驱动：`curl` 拿到的外壳（4KB）和 `aup.*.js`（800KB）里都**没有**任何 locale 文案，所以"线上文案对不对"只能在真实 DOM 里验（§12 的 `$t(...)` 字面量泄漏就是这么抓到的） |

守卫（全部在 `npm test` 里）：

1. `scripts/arcblog-i18n.test.mjs` —— 每个 `$t()` 引用都有 en/zh；en/zh 键集一致；wrapper 键既被引用也被声明；**无死键**（转调 `scripts/arcblog-locales.mjs --check`）。
2. `scripts/arcblog-dsl-artifacts.test.mjs` —— `arc dsl generate --check`（漂移时退出码 5、点名 stale 文件），防"改了 `.aup` 没重新生成"。两条门禁都做了反证：植入一个假键 / 制造一次漂移，各自变红并点名。
3. `node scripts/arcblog-locales.mjs [--check|--write]` —— 死键报告 / 门禁 / 清理（默认 dry-run，与 `arcblog-clean.mjs` 同风格）。

存活判定：一个键只要 (a) 在某个 `i18n {}` 块里声明，(b) 被 `$t()` 引用，或 (c) 在 `.aup/locales` 与 `dist/` 之外以完整 token 被提到，就算存活（匹配必须带 token 边界——`heroes-admin.hero-add` 里含有子串 `admin.hero-add`，只做 `includes` 会误判）。

想保留一个暂时没人引用的翻译 → 在所属页的 `i18n {}` 块里声明它，这是唯一被支持的"这个键是有意的"信号。

浏览器实测：重启 daemon 后 14 个页面（index/about/author/settings/compose/compose-edit/preview/reader + 6 个控制台页）的渲染文本里 **0 个 `$t(...)` 字面量**；控制台页面对访客只渲染 gate 卡（`visible=$session.authenticated`），因此控制台内部的文案覆盖靠门禁 1 的静态检查兜底。

### 18.1 改名/删页的连带清理：两处工具**不会**替你处理（实测）

I21 把默认页 `posts` 改名为 `index` 时实测到的边界——两处残留物都**不被任何门禁发现**，只能手工删：

| 事实 | 证据 |
|---|---|
| `generate` 不删除被改名/删除页面的生成物 | 改名后 `.aup/pages/posts.json` 原样留在磁盘（`app.json.pages` 已不引用它，运行期无害，但它会继续"引用"它里面的 `$t()` 键） |
| `generate --check` 对这类残留**不报警** | 残留在场时 `arc dsl generate --check` 仍输出 `nothing to change`、退出码 0 |
| 残留产物会让死键守卫**瞎掉一部分** | 残留 `pages/posts.json` 里还写着 `$t(posts.feed)` / `$t(posts.feed-empty)` → 守卫先报 **10** 个死键；删掉该文件后才报完整的 **12** 个 |
| `arc blocklet build` 不清理 `dist/` 里的旧产物 | 改名后 `dist/.aup/pages/posts.json`、`dist/.aup/man/posts.yaml` 仍在（build 只发布、不删除） |
| `i18n` 命名空间随页面名走 | 12 个 `posts.*` 键全部变成 `index.*`（键值不变），旧键靠 `arcblog-locales.mjs --write` 清掉；总键数不变（243 → 12 出 12 进 → 243） |
| 页面名唯一被拒的情况是重名 | `Duplicate page "settings"`（app.aup:29:8）；`index`/`wrapper`/`app`/`page`/`default` 都能通过 validate —— **没有保留字表**，但别用 `wrapper`（会和手写的 `wrapper.*` 键撞命名空间） |

改名清单（可复用）：`default <name>` → `page <name>` → **wrapper 的 `brand.src`**（最容易漏，§14b）→ `blocklet.yaml` binding 的 `page:` → `generate --write` → 手删 `.aup/pages/<old>.json` → 手改 `man/<old>.yaml` → `arcblog-locales.mjs --write` → 手删 `dist/` 里的对应产物 → rebuild + restart。对外 URL 不变：`/` 由 `default` 决定、`/posts` 由 binding 的 `path` 决定，两者都与页面名解耦。

## 19. 表单输入的插值：`state={value: "${...}"}` 不解析，`value="${...}"` 解析（实测）

浏览器实测（seo-admin，绑定路由 `/manage/seo` → 服务端 propBind node/profile.json）：

| 写法 | 结果 |
|---|---|
| `input state={value: "${state.profile.name}"}` | 渲染成**字面量** `${state.profile.name}` —— 嵌套对象 prop 不做插值 |
| `input value="${state.profile.name}"` | 正确解析为记录值，且输入可正常编辑（非受控只读） |
| `p "前缀 ${state.profile.name}"`（混合文本） | 该 `p` 不渲染 |

后果与修复：compose-edit 的编辑预填一直用 `state={value: "${state.post.*}"}` —— 即**编辑页预填从未生效**（预填显示为字面量模板）。已统一改为 `value="${state.post.*}"`。表单初始值要插值就用 `value=`；`state={value: ""}` 仅用于静态初始值。

## 20. `afs-list` 的 `emptyText` 不解析 `$t()`（实测）

`emptyText=:list-empty`（编译后为 `"$t(page.list-empty)"`）在运行期**不被求值**：空列表渲染运行时默认的英文 "No items to display"，而不是 locale 里的文案。既有页面（dashboard/admin/heroes-admin）的 emptyText 同样如此——属平台缺口，不是单页写法问题。空态引导文案目前只能靠 emptyText 之外的可见元素承载（如页面级提示卡）。

## 21. 控制台全高流式布局的实测实现（§2.5 落地）

AUP 页面没有页面级 CSS 钩子，但运行时容器链是确定的（实测 DOM）：

```text
body > div.active.full-page (flex column, 100vh)
  > div > div.aup-view (overflow: hidden auto)      ← 运行时"整页滚动"就在这里
      > header.aup-app-header   (48px)
      > 页面内容（slot）
      > footer.aup-app-footer   (199px)
```

因此"页面固定 + 内容区滚动"的可行实现是给 console-shell 一个**由视口高度推出**的固定高度：

| 写法 | 实测结果（vh=1245） |
| --- | --- |
| `row console-shell … style={height: "calc(100vh - 339px)"}` | shell = 906；header 顶端 0；footer 底边在视口内；运行时滚动容器 `1245/1245` 不可滚（页面锁定） |
| `view console-pane … style={overflowY: "auto", height: "100%"}` | 长内容（heroes-admin 2438px）只在 pane 内滚动：`2438/906`，无双滚动条 |
| 宽 820 × 高 900 复测 | 同一常数成立：`900/900` 锁定、pane `561/561`、无横向滚动 |

339 = header 48 + 页面上间隙 20 + 页面下内边距 32 + footer 199 + 余量 40（实测值稳定，footer 高度在本主题下不随视口变化）。若主题/页脚改版，需重新测量该常数——这是平台没有"剩余高度"布局原语时的显式代价。

**取反插值可见性（空态引导的关键机制）**：`visible="!${state.x}"` 与 `visible="${state.x}"` 一样按插值求值并随异步数据更新。实测：dashboard 以 `propBind` 读取 node/profile.json，profile 存在时 `visible="!${state.nodeProfile}"` 的引导卡隐藏、`visible="${state.nodeProfile}"` 的资料卡显示。因此**单记录型空态可以做到条件渲染**（列表型不行——列表是否为空无法用表达式探测，仍用列表后的常驻 dim 说明承载引导）。

### 21.1 顶部栏宽度按页控制：把 `app-header` 移进页面（实测）

运行时样式表里有一条只对 **wrapper 直接子元素** 生效的规则：

```css
#aup-display.full-page #aup-root > .aup-view > .aup-app-header > .aup-app-header-bar {
  max-width: var(--aup-content-max, 1280px);   /* 实测 1200px */
  width: 100%; margin-left: auto; margin-right: auto;
  padding-left: var(--aup-page-gutter); padding-right: var(--aup-page-gutter);
}
```

因此 header 的宽度与页面内容列一样被 `--aup-content-max` 框住，且**无法从页面标记里影响**（header 是页面的兄弟节点，不是子树）。可行做法与页脚相同——把 `app-header` 从 `.aup/wrapper.aup` 移进每个页面：

| 页面类型 | 承载方式 | 实测结果（vw=1722） |
| --- | --- | --- |
| 公共页（index/about/author/reader/preview/page-view） | header 作为页面首个节点，外包 `view style={margin: "0 calc(-1 * var(--page-gutter, 32px))"}` 抵消列内边距 | header bar 261→1461，品牌左缘 293 = 内容左缘 293（与改版前一致） |
| 控制台页（9 页） | header 放进 `view console-topbar style={width: "100vw", marginLeft: "calc(50% - 50vw)"}` | header 0→1722、shell 0→1722，两者等宽且贴边；品牌左缘 32 = 侧栏左缘 32 |

副作用与修正：header 移入页面后 `:theme-label` / `:nav-console` 这类 **wrapper 命名空间简写不再解析**（页面 i18n 作用域里没有这些键），必须写成 `$t(wrapper.theme-label)` / `$t(wrapper.nav-console)`。

### 21.2 控制台骨架的最终几何与三处修正（实测）

```text
chrome 130px = 页内 topbar 48 + 页面根 gap 30(48→shell 间距) + scroller gap 20 + scroller 底部内边距 32
console-shell  height: calc(100vh - 130px)
console-pane   height: 100%   （本身不滚动）
console-scroll height: 100% + flex:1 + overflow-y:auto  ← 唯一滚动容器，页头固定在其外
console-topbar width: 100vw + margin-left: calc(50% - 50vw)
```

| 修正 | 原因 |
| --- | --- |
| 滚动区直接子项加 `flexShrink: 0` | 否则 flex 会把卡片压扁（实测卡片 103px 装 168px 内容、文字被裁），而不是产生滚动 |
| 含滚动区的 wrapper 加 `style={height: "100%", minHeight: 0}` | 否则 `flex: 1` 的滚动区无法解析高度，滚动落到外层 scroller（双滚动条） |
| 控制台不渲染 `app-footer`，品牌/关于/RSS 收进侧栏底部 | 控制台是应用而非文档，页脚占用视口；公共页保留原页脚 |

侧栏扁平化（实测 computed）：`console-nav` border 0px / radius 0px；菜单项 border 0px / radius 0px / 宽 172px(=200−28)；当前项用 `variant=primary` 的实心块，不再依赖胶囊描边。

### 21.3 侧栏扁平化与列表自动聚焦（实测踩坑）

| 事实 | 证据 / 处理 |
| --- | --- |
| `view` 有默认 `gap: 20px` | 侧栏 19 个子元素 → 18×20=360px 额外高度，页脚被挤出容器（scrollHeight 960 / clientHeight 876）。显式 `gap: "0"` 后 876/876 正好容纳 |
| safe-style **丢弃** `borderBottom` | 菜单项之间画不出分割线；改为生成 `view console-nav-divider-<page> style={height: "1px", background: "var(--color-border)"}`。注意 id 必须全局唯一 |
| `action` 的 style 只保留部分键 | 实测 `border` / `borderRadius` / `padding` 生效，`width` / `justifyContent` / `flexShrink` 被丢弃；`-> navigate` 型按钮因此渲染为窄链接（98px）。侧栏项统一改用 `-> page`（客户端切换），导航目标由 `view console-nav` 容器统一样式 |
| 列表原语会自动聚焦 | `afs-list` 挂载后取得焦点（`document.activeElement` = 对应列表），浏览器把**最近的滚动容器**滚到该列表：dashboard 实测 `console-scroll` 初始 `scrollTop=199`。页头因固定在滚动区之外而保持可见，但滚动区顶部内容在首屏被滚过——平台行为，`subscribe` 开关与 `overflow: hidden` 包裹均无法消除（后者还会破坏布局，已回滚） |
| 客户端 `propBind` + `value="${...}"` 可预填表单 | 实测 `?page=seo-admin` 直接进入时四个输入框已填好，因此 `seo-admin` 不再需要绑定路由；侧栏项得以统一为 `-> page seo-admin` |

### 21.4 侧栏扁平化的二次踩坑与最终做法（实测）

| 事实 | 证据 / 结论 |
| --- | --- |
| **页面根的直接子元素会被统一 cap** | 规则 `#aup-display.full-page #aup-root > .aup-view > :not([data-mode="panel"]):not([data-mode="shell"])` 施加 `max-width: var(--aup-content-max)`(1200) + `width:100%` + `padding: 0 32px`。因此**全出血必须发生在更深一层**：外层容器被 cap 到 1200px，其子元素用 `width: 100vw; margin-left: calc(50% - 50vw)` 逃逸（对 1200px 容器算得 −261px，正好落回 0） |
| `gap=0` 属性无效，`style={gap: "0"}` 有效 | 顶栏与骨架之间的 20px 间隙来自 `view` 的默认 gap=20px；属性写法不生效 |
| `action` 的 style 转发**部分**键 | 实测转发：`border`、`borderRadius`、`padding`、**`color`、`background`**；丢弃：`width`、`justifyContent`、`flexShrink`。所以选中态不能用 `variant=primary`（其 CSS 居中标签），而是给 action 自身加 `background: var(--color-text)` + `color: var(--color-bg)`，未选中保持默认左对齐满宽 |
| `view href` 菜单项会被插入「←」字形 | 运行时为链接渲染一个箭头子节点（`link "← 关于"` 里含独立 `StaticText "←"`），菜单行不能用 `view href`；用 `action -> page`（无箭头、满宽） |
| 触底需要负外边距 | 运行时 scroller 在内容下方固定留 `gap 20px + padding-bottom 32px`；`console-shell` 用 `height: calc(100vh - 48px)` + `margin-bottom: -52px`，既让侧栏底边落到视口底部（实测 gapBottom=0），又不产生外层滚动 |

### 21.5 精修相关的实测约束（gap token / 网格 / 叶子节点）

| 事实 | 证据 / 用法 |
| --- | --- |
| `gap` 属性是**离散 token**，不是任意值 | 实测 `gap=sm` → 10px、`gap=md` → 20px（= 默认值）、`gap=lg` 更大。想收紧间距必须显式写 `gap=sm`；`md` 与默认值相同，写它等于没改 |
| 卡片内边距只受运行期 CSS 控制，可被内联覆盖 | 默认 `padding: 20px`（`--space-block`）；`card … style={padding: "14px"}` 实测生效 |
| 视图支持内联网格 | `style={display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))", gap: "14px", alignItems: "start"}` 实测渲染为真实 grid，1722px 视口 2 列；`alignItems: start` 不加则同行卡片被拉伸等高 |
| 网格不能包标题 | `h2`/`h3` 与裸 `afs-list` 若与卡片同为滚动区直接子元素，包进 grid 会把标题变成网格单元 → 仅对"全部是卡片"的页面启用网格 |
| `h2`/`h3` 是叶子节点 | 给它们追加样式时**不能带 `{`**（`h2 :title level=2 style={...}` 是完整写法）；误加 `{` 会破坏后续结构（validate 报 `"content" requires an id` 之类的错位错误） |
| 标题字号可用 CSS 变量覆盖 | `--type-heading` 21.6px（默认 h2）→ 显式 `fontSize: var(--type-subheading)`(17px) / `var(--type-body)`(15px) 实测生效 |

### 21.6 卡片与按钮样式（审计结论）

| 项目 | 实测事实 |
| --- | --- |
| 卡片默认样式 | `card` 自带 `padding: 20px`、`gap: 20px`、`radius: 10px`、`1px solid rgba(0,0,0,.08)` 描边 **+ `0 1px 2px rgba(0,0,0,.08)` 投影**。控制台统一覆盖为 `style={boxShadow: "none", padding: "14px"}` + `gap=sm`（10px），只留描边与填充 |
| 按钮默认圆角不统一 | 运行时 `variant=primary` 是 8px，而 `secondary`/`ghost` 是 **32px**（胶囊）→ 同一行里三种圆角。内联 `borderRadius: "var(--radius-md, 8px)"` 可统一（action 会转发 `borderRadius`） |
| action 会被容器拉伸 | 卡片是 flex 列（`align-items: stretch`），放进卡片的 action 直接变成整卡宽（实测 1372px / 1402px）→ 包一层 `row cross=start` 后恢复内容宽（实测 63–102px） |
| grid 列表行会拉伸行内按钮 | `afs-list layout=grid itemStyle=card` 的行内 action 被拉到卡片等高（实测 140px）→ 行上加 `cross=start`，实测回落到 31px |
| 尺寸档实测 | 默认档 `padding: 8px 16px` / 高 39px / 字号 14.4px；`size=sm` 档 `padding: 5px 12px` / 高 31px / 字号 13.6px |
| 审计口径 | 逐页量 `[data-mode="card"]` 的 padding/gap/radius/boxShadow 与 `console-pane` 内所有可见 `button` 的 radius/height/padding/width，取唯一值集合判断一致性 |

### 21.7 列表行与链接的细节（逐元素审计结论）

| 项目 | 实测事实 |
| --- | --- |
| 行背景（"绿色条"） | `afs-list` 未声明 `autoSelect=false` 时，首个模板行带 `data-selected="true"`，命中 `.aup-list-template-item[data-selected="true"] { background: var(--color-accent-bg) }` → 整行淡绿底。19 个列表里 17 个缺这个属性，全部补上后背景变透明 |
| 行内边距 | `.aup-list-template-item` 默认上下 20px；左右由运行时强制：`click-mode="none"` + `layout=list` → `padding-left/right: 0 !important`；可选中列表 → `padding-left: var(--space-block) !important`。**因此行的左右内边距无法用内联样式覆盖**，需要左右留白时要在行内再包一层 `view`（hero 卡片即此法） |
| 行的分隔线 | safe-style 丢弃 `action` 的 `borderBottom`，但 **`view`/`row` 上的 `borderBottom` 有效** → 行分隔线写 `style={borderBottom: "1px solid var(--color-border)"}` |
| "←" 箭头 | `.aup-view-link:not([data-mode]):not([data-layout]):has(> .aup-text:only-child)::before { content: "←" }` —— 只含一个文本子节点的 `view href` 会被加上返回箭头。加 `layout=inline`（或任意 `data-layout`/`data-mode`）即消除。**内容型链接去箭头，返回/外链型保留**（reader-back、preview-back、page-back、seo 的 RSS 与文章索引） |
| 箭头检测的坑 | 没有该伪元素时 `getComputedStyle(el,'::before').content` 返回 `"normal"` 而**不是** `"none"`；只有命中规则且被置空才是 `"none"`。判断"是否有箭头"必须用渲染文本或同时接受 `normal`，否则会误报（本次审计第一轮即误报 studioLink） |
| 运行时网格列数不可控 | `afs-list layout=grid` 固定渲染 6 列（auto-fill，实测每列 226px）；`columns=2` 能通过校验但运行时忽略（DOM 无 `data-columns`）；`style={alignItems:"start"}` 作用于列表根元素、传不到 `.aup-list-body`（实测仍 `normal`，行被拉伸等高）。要自控列数只能用**外层自建 `view` 网格**，而 `afs-list` 是网格的单个子项，因此记录不会自动分列——实用做法是整行卡片列表 |

### 21.8 行"绿底"的兜底与内容对齐（第二轮）

| 项目 | 结论 |
| --- | --- |
| 兜底做法 | 除可选中列表外，控制台每个列表行都写了内联 `background: "transparent"`。内联样式优先于 `.aup-list-template-item[data-selected="true"] { background: var(--color-accent-bg) }`，**实测在 DOM 上强制 `data-selected="true"` 后背景仍为透明**，因此任何状态/复查都不会再画出绿底 |
| 例外：可选中列表 | `hero-quickadd-list`（`clickMode=select`）刻意保留选中底：它是"已暂存该行"的唯一反馈，去掉会让点击无反馈 |
| 行内容的左右对齐 | 运行时对 `[data-click-mode="none"][data-layout="list"]` 强制 `padding-left/right: 0 !important`，所以行内容**无法**再靠行内边距内缩；实测行内容与同卡片标题左边缘完全对齐（差值 0px），左右留白来自卡片 `padding: 14px`，上下来自行 `padding: 8px 0`。若强行给行内容加横向内缩，会与卡片标题错位，故不做 |

### 21.9 取消卡片 hover 上移（`card` 原语的 lift 无法用内联样式关掉）

| 项目 | 实测事实 |
| --- | --- |
| 规则本体 | `.aup-view[data-mode="card"]:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover, var(--shadow-card)); }` —— 鼠标悬停时整块面板上移 2px（实测 `top` 170→168），上移会压住/裁掉上边缘，页头面板贴滚动区顶部时尤其明显 |
| 内联样式关不掉 | 运行时的样式清洗器**丢弃 `transform`**（编译产物 `.aup/pages/*.json` 里确实有 `"transform": "none"`，但 DOM 的 `style` 属性只剩 `box-shadow`/`padding`）。`translate: "0 2px"`（个体变换属性，可与 `transform` 叠加抵消）同样被丢弃 |
| 可行做法 | 面板改用**普通 `view`**，用卡片 token 复刻外观：`background: var(--card-bg)`、`border: var(--card-border)`、`borderRadius: var(--radius-lg, 10px)`、`padding`（控制台 14px；公共页保持默认 `var(--space-block, 16px)`）。没有 `data-mode="card"`，hover 规则无从匹配 |
| 验证 | 改后逐页实测：面板 `padding|gap|radius|border|transform` 唯一值为 `14px|10px|10px|1px|none`（公共页 `20px|20px|10px|1px|none`），悬停时 `transform: none`、`top` 不变、hover 也不再冒阴影；9 个控制台页网格列数、滚动锁定、空态文案均无变化 |
| 影响面 | 全站 65 个面板（42 控制台 + 23 公共页）已全部由 `card` 改为 token 化的 `view`；`scripts/` 与测试没有依赖 `data-mode="card"` |
| 备选方案为何不用 | `variant=docs-info-card` / `docs-action-card` 虽自带 `:hover { transform: none }`，但分别附带 3px accent 左边框、`flex-flow: wrap` 与子元素外边距规则，会改变外观 |

### 21.10 链接的新标签页（`target` 支持，实测）

| 事实 | 证据 |
| --- | --- |
| `view href="…" target=_blank` 与 `action … href="…" target=_blank` **都被支持** | 运行时源码（`/aup.<hash>.js`）：渲染 `href` 时 `t.target && (a.target = t.target, String(t.target).toLowerCase() === "_blank" && (a.rel = "noopener noreferrer"))`；`action` 有 `href` 时创建 `<a class="aup-action">`（无 `href` 时才创建 `<button>`），因此按钮外观（`variant` / 内联样式）与"新标签页"可同时成立 |
| 自动补 `rel` | DOM 实测：`<a class="aup-action" href="/?page=compose" target="_blank" rel="noopener noreferrer">写文章</a>`；`view href` 同理 |
| `-> navigate "url"` 不支持 target | 运行时是 `window.location.href = l.url`（同标签页）。需要新标签页时改用 `href` + `target=_blank` |
| 事件结果里的 `open_url` | 运行时另有 `case "open_url": window.open(l.url, "_blank")` 分支，可用于事件驱动的打开 |
| 控制台应用规则 | 控制台页面框架内切换；公共/独立页面与非 HTML 资源新标签页；登录同标签页（UI 标准 §2.6） |

### 21.11 局部刷新的三级机制与单记录缺口（实测）

问题：AUP 是否支持"只刷新一部分"？实测结论是**支持，但只有两级可用，单记录绑定不在此列**。

| 级别 | 机制 | 触发 | 实测证据 |
| --- | --- | --- | --- |
| **区域级（数据）** | `afs-list … subscribe=true`，运行时把订阅登记进 live 协调器（`Na` 注册表，按 `liveScopeKey`/`currentPath` 分组，每条订阅带 `refresh()`） | 服务端 WS 推送的 `afs:append` / `afs:update` / `afs:remove` / `afs:bulk`/`afs:write` 事件；另有轮询兜底 `pollIntervalMs`（默认 45000ms，下限 5000ms，`jitterMaxMs` 400），页面隐藏时 `stopLivePoll()` | 打开仪表盘后在 CLI 发布一篇文章：列表 2.5s 内多出新行，而 `window.__probe` 仍存在、`performance.getEntriesByType('navigation')[0].type` 仍是 `navigate` → **未重载，只重渲染该区域** |
| **页面级** | `-> page X`（客户端 `navigate` 消息，带 `pageId/content/format/layout`）在同一个文档里替换页面 | 侧栏/按钮点击 | 仪表盘 → 运维 → 仪表盘：URL 变为 `?page=operations` 再变回，`window.__probe` 存活、navigation type 不变 → 框架与 JS 上下文都保留 |
| **自定义订阅** | `window.afs.subscribe({type:"afs:write"|"afs:*", path}, cb)`（Web 组件用 `aup_bridge_subscribe` 消息） | 指定路径写入 | theme bridge：CLI 改 `tone` 后 `<html data-tone>` 无刷新变化（§17） |
| **单记录 `propBind`**（有缺口） | 面板与 `console-pane` 上没有 `data-bind-id`，不登记进 live 协调器的 `refresh()` 列表；**但数据写入事件会让面板重渲染** | AFS 写入事件（与列表同一路 WS 事件） | ① 数据变化会更新：CLI `node set --name "ArcBlog LiveProbe"` → 已打开仪表盘的节点卡 4s 内从 `ArcBlog` 变成 `ArcBlog LiveProbe`（`window.__probe` 存活、无重载）② **首屏竞态**：新建标签页打开仪表盘时节点卡只渲染 `v`、`●`、`角色`、`能力` 标签，名/DID/角色/能力全空，等 5s 仍空；页内切走再切回后正确显示，reload 也正确（同一时刻记录本身是合法 JSON 且字段齐全）→ 首次渲染早于绑定解析，且**初始解析不会触发重渲染** |

**粒度**：平台没有细粒度 DOM diff；"局部刷新"的最小单位是**一个区域（订阅块）或一整页**。没有"刷新按钮"原语；`auto-fire` 只在挂载时 fire 一次 `exec`（带 `dedupKey`，60s 去重窗口），不能用来刷新一个 bind。

**ArcBlog 的用法约定**：
- 列表数据（帖子、订单、Hub、媒体、授权…）统一 `subscribe=true`：写入后自动回填，这是控制台"数据新鲜"的主力机制。
- 单记录卡片（节点档案、健康、发现文档、策略）在**数据变化时**会更新（同一路事件），但在**首次打开**时可能因竞态保持空白。运营者侧的确定性办法：页内切页往返（`-> page`）或 reload。
- 想彻底消除首屏空白有两条路，都需要**按竞态特性做多次新开页验证**（单次通过不能算数）：① 把可见性挂在嵌套字段（`visible="${state.x.name}"`），风险是初始解析若不触发重渲染则该卡片会一直隐藏，可能比"空白"更糟；② 单记录内容改由**订阅列表**承载（1 行也能订阅，但 `node/` 目录含多份记录，按 id 过滤依赖索引、有已知陈旧问题）。在选定之前，不把空白卡片解释为"数据不存在"。

### 21.12 交互式会话与节点级 patch：平台能力 vs 本实例可达范围（实测）

官方参考（ARC 2.0.0-beta.25，[Patches, scenes, and capabilities](https://www.arcblock.io/en/docs/aup/patches-scenes-capabilities-reference/)）明确：
interactive session 从一棵已渲染的 AUP tree 开始，后续变化以 **patch 打在有版本的 tree 上**，patch 词汇为 `create` / `update` / `remove` / `reorder`；
这是 **renderer/session 的同步机制**，不是让作者去编辑传输消息；并且 **"a target that misses or rejects an update must not be assumed to have applied the author's intended state merely because a source file validated"**。

**平台侧证据（本机运行时 bundle `/aup.<hash>.js`）**：

| 事实 | 证据 |
| --- | --- |
| 交互式会话带 tree 版本 | `join_session` 消息带 `treeVersion`；`window.afs.sessionId` 存在 |
| patch 词汇被实现 | 渲染器按 `op` 分派：`create` / `update`（写 `src` / `props` / `state` / `events` / `children`）/ `remove` / `reorder` |
| DSL 暴露节点级更新 | `arc dsl schema`：`event = { exec, args, target, set:{ src, props, state, page }, page, navigate }`；`action <id> -> set <target> props {src: "…"}` 编译为 `events.click = { target:"<target>", set:{props:{src:"…"}} }` |
| 存在客户端就地更新路径 | 事件结果里的 `{target, set}` 由客户端直接应用：`state.value`/`props.draftKey`（输入与编辑器）、`state.open`（overlay 开合）、`state.activeTab`（页签）、`props.src`（iframe src）——不重渲染其他区域 |
| 存在子区域订阅 | `afs-list subscribe=true` 与 `window.afs.subscribe({type:"afs:write", path}, cb)`（§21.11） |

**本实例实测（ArcBlog，daemon 上的 AUP app 渲染模式）**：

| 尝试 | 结果 |
| --- | --- |
| `action -> page <console-page>`（`target:_root` + `set.page`） | ✅ 生效：URL 与右侧内容变化、无文档重载；但**整页子树被重建**——`console-nav` / `console-pane` / `console-shell` 的 DOM 对象全部是新实例（旧节点上的 `dataset` 标记消失），只有 JS 上下文与 `window` 变量存活 |
| `afs-list subscribe=true` | ✅ 真区域刷新：CLI 写入后列表多出新行，其他区域 DOM 不变（§21.11） |
| `action -> set probe-frame src "/posts/hello-arcblog"`（`set.src`） | ❌ 无效果：iframe src 不变 |
| `action -> set probe-frame props {src: "/posts/hello-arcblog"}`（客户端路径 `props.src`） | ❌ 无效果：iframe src 不变 |
| 上述两次尝试的 WS 轨迹（直接 URL 打开、以及经应用自身 `-> page` 切页到达，共 3 次） | 客户端发出 `{"type":"aup_event","nodeId":"probe-swap","event":"click"}`，服务端回复 `{"type":"aup_event_result","nodeId":"probe-swap","error":"AUP node not found: probe-swap"}`；无控制台报错、无 patch 应用 |

即：**DSL 校验通过 ≠ 更新被应用**（正是官方文档警告的情形）。在本实例的会话里，页面节点没有作为事件源被发现（而 `exec` 动作与 AFS 订阅都正常），因此"**左侧菜单固定、右侧内容用 `-> set content src …` 局部替换**"这一模式在本实例**不可达**；可达的等价手段只有两种：**页面级切换**（整页子树重建、无文档重载）与**订阅区域**（列表 / 组件订阅）。

**ArcBlog 结论**：控制台维持"一事一页 + `-> page` 切换"是当前平台版本下的务实选择；若将来确实需要 React 式的右侧局部替换，先在目标 daemon/运行时上升级后**重测节点级 `set`**，或把右栏内容建成**订阅区域**（列表/组件订阅）而不是依赖节点级 `set`。探查用的临时页面已在验证后删除，未进入产品代码。

### 21.13 单页内的区域级就地切换：`view mode=tabs`（实测，方案 3 结论）

在 §21.12 确认"节点级 `set` 不可达、`-> page` 会重建整页子树"之后，实测出一个**可达的区域级就地切换**机制：`view mode=tabs`。

**DSL 形态**（`tab` 别名在本版本不被接受——`tab <id> { … }` 报 `action node missing required content`；用规范形式）：

```
view probe-tabs mode=tabs {
  view probe-panel-posts label="Posts" { … }      // 每个 child 就是一个页签面板
  view probe-panel-taxonomy label="Taxonomy" { … }
}
```

编译为 `{"type":"view","props":{"mode":"tabs"},"children":[…]}`。运行时行为（bundle 证据）：`mode === "tabs"` 且有 children 时渲染 `.aup-tab-bar`（每个 child 一个 `.aup-tab`，`data-tab-id`=child.id，标题取 `props.tabLabel || props.label || id`）与逐 child 的 `.aup-tab-panel`；`state.activeTab` 决定初始选中；**点击处理器先就地切换 `data-active`（tab 按钮 + 面板），随后才发 `tab-change` 事件**。

**实测（探针页：稳定侧栏 + 右侧 `view mode=tabs` + 两个各带 `afs-list subscribe=true` 的面板）**：

| 观测 | 结果 |
| --- | --- |
| 点第二个页签后，侧栏 DOM 对象 | **同一个对象**（`dataset` 标记保留） |
| 页签容器 / 两个面板包装 / 两个 `afs-list` 节点 | **全部同一对象**，仅 `data-active` 由 `["true","false"]` 变 `["false","true"]` |
| WS 帧 | **零帧**（切换完全在客户端，无服务端往返） |
| JS 上下文与 `navigation.type` | 存活 / `navigate` 不变 |
| 非激活面板里的订阅 | **仍在工作**：外部 CLI 发布后，隐藏面板的列表分页从 1 变 `1 of 2`（节点未销毁） |

**结论与取舍**：`view mode=tabs` 是当前平台版本下唯一实测可达的"框架不动、只换右侧内容"机制，且成本为零（无网络往返、DOM 复用）。它与"一事一页 + `-> page`"是互补关系：

| 维度 | 一事一页（现状） | 单页 + 页签 |
| --- | --- | --- |
| 深链 / 书签 | ✅ 每节一个 `?page=` | ⚠️ 页签不进入 URL（本版本未验证可深链），刷新回到默认页签 |
| 切换成本 | 整页子树重建（DOM 重建、订阅重挂） | ✅ 零往返、DOM 复用、侧栏状态（滚动/焦点）保留 |
| 页面体积 / 订阅数 | 小（只挂当前节的订阅） | 大（所有面板的订阅常驻，隐藏面板也在刷新） |
| 适用 | 拓扑清晰、要分享链接 | 同一节内的子视图、列表+详情、向导式多步 |

因此 ArcBlog 的取值：**保持"一事一页"作为默认拓扑**；在"同一节内确有多个子视图"或"列表 + 详情"处用 `view mode=tabs`（例如经济、站点、运营节内的子视图，或列表旁的详情面板），从而在不牺牲深链的前提下拿到 React 式的就地切换。探针页已在验证后删除。

### 21.14 控制台单页化：hash 路由 + 就地切换（重构实测）

控制台从「15 个 `?page=<name>` 页面 + 每页重复侧栏」重构为**一个页面 + 15 个节（页签面板）+ hash 深链**，对齐 `.well-known/service/user#profile` 那种交互。本节记录支撑它的平台事实（全部本机实测）与踩到的三个坑。

**结构**：`page console`（`?page=console`）→ `view console-frame` → 顶栏 + 门禁卡 + `row console-shell`（侧栏 `view console-nav` + `view console-pane` → `view console-sections mode=tabs` → 15 个 `view console-section-<id>` 面板）。侧栏项是 `action console-nav-<id> href="#<id>"`（保留按钮外观），运行时 tab 条由桥隐藏，页签引擎负责切换。

| 机制 | 实测结果 |
| --- | --- |
| 点侧栏项 / 程序化点击页签（`view mode=tabs`） | **就地切换**：`console-nav`、`console-sections`、15 个面板、面板内 `afs-list` 的 DOM 对象**全部复用**（`navSame/tabsSame/panelsSame` 均为 true），URL 更新为 `#<section>`，无文档重载（§21.13 同） |
| 浏览器后退 / 前进 | 回到上一个 section，15 个面板仍在，高亮跟随（`popstate` 恢复） |
| 默认 landing | `replaceState` 写入 `#dashboard`，不污染历史 |

**坑 1：`hashchange` 会让运行时整页重渲染。** 直接 `location.hash = '#x'` 或用原生 `<a href="#x">` 导航后，`console-nav`/`console-sections`/面板 DOM **全部换成新对象**（视觉无感、无文档重载，但子树重建）。→ 桥改为：捕获侧栏点击 `preventDefault()`，用 `history.pushState` 改 URL（不触发 hashchange），再程序化点击页签；实测 DOM 全量复用。

**坑 2：未知 `?page=` 会被归一化掉。** 访问已删除的 `?page=admin` 时，运行时渲染默认页并把 URL 归一化为 `?locale=zh`——bridge 是 iframe，脚本执行时那个参数已经没了，无法迁移。→ 为 15 个旧页名各保留一个**极简别名页**（3 行，仅 `p "$t(wrapper.console-opening)"`，`admin.json` 0.3 KB），运行时因此保留参数；桥用 `sessionStorage` 交接 section 后 `location.replace('/?page=console')`，控制台落地时取回并写成 `#<section>`。`/manage/seo` 这类**绑定路由**同理：绑定指向别名页 `seo-admin`，桥在控制台页内 `replaceState` 规范化为 `?page=console#seo-admin`（实测：`/manage/seo` → `?page=console&locale=zh#seo-admin`）。

**坑 3：bridge iframe 无法导航顶层文档。** `frame` 默认 sandbox（`allow-scripts allow-forms allow-popups allow-same-origin`）**静默阻止**跨框架顶层跳转（与 §8 的 `target=_parent` 同一原因）。→ 声明 `sandbox="allow-top-navigation"`；运行时把合法 token 追加到基础列表（实测 iframe 属性为 `allow-top-navigation allow-scripts allow-forms allow-popups allow-same-origin`），迁移跳转随即生效。

**代价与取舍（实测数字）**：单页首屏加载全部 15 节 —— `console.json` **302 KB**（重构前 13 页合计 487 KB，但只加载当前节），DOM 里常驻 **17 个 `afs-list` 订阅**（隐藏面板的订阅仍在刷新，§21.13），页面上共 15 个面板。换来的是：切换零网络往返、0 次 DOM 重建、侧栏滚动/焦点保留、深链与前后退可用。页面渲染后**无整页滚动**（`scrollHeight === clientHeight`），滚动只发生在当前节的 `console-scroll-*` 容器内（实测 admin 节：面板 930px、内层 scroller 815px、`overflowY: auto`）。

**点击去向规则（重构后）**：控制台内切换一律 `href="#<section>"`（就地替换面板）；只有**阅读文章** `/posts/<slug>`、**草稿预览** `/preview/<slug>`、**草稿编辑** `/edit/<slug>`、静态页 `/pages/<slug>` 与**非 HTML 资源**（RSS、`llms.txt`）用 `target=_blank` 新标签页。后者中 `/edit/<slug>` 是记录绑定的路由（面板是静态 DSL，无法承载动态 slug），因此与预览同列为例外。

#### 21.14.1 上线后修掉的三处（复测记录）

重构首版上线后暴露三个问题，都已修复并复测；其中两条是平台行为，值得后续复用：

| 症状 | 根因 | 修法 | 复测证据 |
| --- | --- | --- | --- |
| 顶栏不是 100%（两侧留白） | 合并页面时**丢了 `view console-topbar` 包装**（只搬了 `app-header` 本身），全宽技巧 `width:100vw; marginLeft:calc(50% - 50vw)` 失效，顶栏被 `--aup-content-max`（1200px）框住 | 恢复 `view console-topbar` 包装 | 顶栏宽 1722px = 视口宽（复测三次切换后仍为 1722） |
| 选中菜单样式不对（只有文字背后有底色） | `action href` 渲染成 `<a class="aup-action">`，运行时把它**按行内方式布局**：在 258px 的列里实测宽仅 **91px**，不随列拉伸（旧的 `-> page` 按钮是块级铺满） | 桥注入 CSS `[data-aup-id^="console-nav-"]{align-self:stretch;width:auto;box-sizing:border-box}`（+ active/hover 底色） | 选中行宽 **257px**（= 侧栏宽），底色 `rgb(26,26,31)`、文字 `rgb(250,250,248)`，每节切换都跟随 |
| 切换节"感觉整页刷新" | 桥原先靠**点击运行时页签按钮**切面板，而该按钮的处理器会向服务端上报 `tab-change`（实测一次 `POST /api/aup/event`，body 为 `{"nodeId":"console-sections","event":"tab-change",...}`），响应回来后**重写侧栏与面板子树**（实测每次点击 nav 4~6 次、sections 45~47 次、frame 49~53 次变更），选中态被抹掉再补回 → 视觉闪动 | 桥不再点按钮，改为**直接切换面板 DOM 状态**（`data-active`/`aria-selected`，与运行时处理器同一套契约；结构不符时回退为点击） | 点击后 **0 次 `/api/aup/event`**、`console-nav`/`console-frame`/各面板**同一 DOM 对象**、`window` 标记存活、`navigation` 条目数不变；残余变更全部来自桥自身的属性写入 |

| 悬停菜单项时文字看不见 | 桥的 hover 规则只改了背景（`--color-accent-bg`，浅色），没有改文字色；选中项的文字色是 `--color-bg`（近白），于是悬停选中项 = 浅底 + 浅字 | hover 规则同时设定 `color:var(--color-text)`；并追加**选中态的 `:hover` 变体**（保持深底反白），CSS 顺序改为 hover 在前、active 在后 | 悬停未选中项：底 `rgba(42,110,0,.08)` + 字 `rgb(26,26,31)`，对比度 **16.59:1**；悬停选中项：底 `rgb(26,26,31)` + 字 `rgb(250,250,248)`，对比度 **16.59:1**（两态都可读） |

| 从绑定路由进控制台时 URL 带着旧路径 | 在 `/posts/<slug>`、`/store` 这类绑定路由上，用户菜单的"管理后台"是**应用内换页**：运行时保留当前 path，只把 `?page=console` 追加到查询串（实测 `/posts/hello-arcblog?page=console#dashboard`），页面正确但 URL 撒谎——分享/刷新会落到文章页语义上 | 桥的 `setHash()` 统一产出规范 URL：`/?page=console` + 其余查询参数（如 `locale`，去掉 `page`）+ `#<section>`，用 `replaceState` 立即改写 | 文章页 → 管理后台：`/?page=console&locale=zh#dashboard`；商店页同样；`/manage/seo` → `/?page=console&locale=zh#seo-admin`（面板与高亮均正确） |

**历史与深链（一并定案）**：`pushState` 每节一条历史会与运行时的历史处理互相打架——实测 `history.back()` 后立刻收到一次 `popstate` 把上一个 hash **原样塞回**，栈不移动。因此节切换只做 **`replaceState`**：URL 始终带 `#<section>`（可深链、可分享、刷新后恢复），但浏览器前进/后退按普通页面离开控制台。这是当前运行时能力下的诚实取舍，待运行时暴露导航历史接口再改。

### 21.15 页脚排版：分割线在顶边、链接横排（平台 CSS 覆盖）

平台 `app-footer` 原语的 DOM/样式是固定的（bundle 证据 + 线上 `aup-app.css` 实测）：

```
footer.aup-app-footer
  div.aup-footer-top        ← brand（.aup-footer-brand）+ columns（.aup-footer-columns > .aup-footer-column > .aup-footer-link-wrap 逐条竖排）
  div.aup-footer-bottom-bar ← .aup-footer-copyright + .aup-footer-bottom-links（margin-left:auto，天然横排）
```

| 事实 | 证据 |
| --- | --- |
| 那条横线是 `.aup-footer-bottom-bar` 的 `border-top`，不是页脚顶边 | 线上 CSS：`.aup-footer-bottom-bar{display:flex;...;border-top:1px solid var(--color-border);padding-top:16px}` |
| 链接列默认**竖排** | `.aup-footer-column{display:flex;flex-direction:column;gap:8px}` |
| 底部链接天生横排且右对齐 | `.aup-footer-bottom-links{...;margin-left:auto}` |
| `app-footer` 只有 `brand` / `columns` / `social` / `bottomBar` 四个 props，没有 variant/divider 开关 | 渲染器 `fh()` 只读这四个字段；平台自带的 build-info 页脚是用 `.aup-build-info-footer .aup-footer-bottom-bar{border-top:none}` 这条**额外 class** 关掉横线的 |

因此「横线在顶边 + 右侧链接一行」无法用 props 表达，需要覆盖样式。ArcBlog 由 theme bridge（本就负责宿主文档外观）注入一处全局样式，随每次 render 幂等重放：

```css
.aup-app-footer{border-top:1px solid var(--color-border);padding-top:20px}
.aup-footer-bottom-bar{border-top:0;padding-top:0}
.aup-footer-columns[data-count="1"]{grid-template-columns:auto;justify-items:end}
.aup-footer-column{flex-direction:row;flex-wrap:wrap;gap:20px}
```

实测（`?page=about` 与首页 `/`，中英双语、宽屏与 500px 窄屏）：

| 观测 | 结果 |
| --- | --- |
| 页脚顶边 | `border-top: 1px solid`，底栏 `border-top: 0`（页脚内不再有横线） |
| 链接 | 关于/商店/作者/RSS 或 About/Store/Author/RSS **同一行**（`y` 相同）、靠右 |
| 顺序 | 品牌 → 标语 → 链接 → 版权 |
| 窄屏 | `scrollWidth === clientWidth`，无横向溢出；链接行可换行不溢出 |
| 代价 | 依赖平台 class 名（与 §21.4/§21.14 同类的"实测契约"）；平台改版需复测这四行 |
