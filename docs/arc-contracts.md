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



## 4. DID Space（持久数据面）

- `arc space init <dir>` / `check` / `list` / `tree` / `path` / `sync` / `migrate`。
- 数据面即 AFS 路径（`/spaces`，会话内 `/user`、`/instance`、`/space`）：应用默认不需要额外
  DB + 对象存储（spec §6 与之一致）。
- 现有 ArcBlog space 已承载 116 个文件，说明 `/instance/app/arcblog/*` 落在这里。

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
- 包内 `agents/<name>/{agent.dsl,agent.json,system.md}` 是官方配方支持的 agent 声明位置。
- `arc blocklet check .` 会报告 agent 数量（当前 ArcBlog 为 `agents: 0`）。

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
