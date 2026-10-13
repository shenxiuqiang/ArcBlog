# 01 — `@abtnode/blocklet-services@1.17.12` 解剖

> **材料**：`npm pack @abtnode/blocklet-services@1.17.12` → 解包 528 个文件（`package/api/**` 服务端 + `package/dist/**` 前端产物）。
> **定位提醒**：这个包服务的是 **1.17.x 的 blocklet-server**。本机跑的是 **arc 2.0.0-beta.66**，服务台已重写
> （实测 `/api/env`、`/static/**`、`/admin/navigation` 全部 404）。**读它的价值是"服务清单"与"职责划分"，不是照着写集成。**
> 等级标注同 [`03`](03-arc2-服务面实测.md)。

---

## 1. 包身份【代码，`package.json`】

| 字段 | 值 |
| --- | --- |
| `name` / `version` | `@abtnode/blocklet-services` / `1.17.12`（npm 上共 987 个版本，`latest=1.17.12`，`beta=1.17.13-beta-20260613…`） |
| `description` | **"Provide unified services for every blocklet"** ← 一句话定义 |
| `main` | `api/index.js` |
| `repository` | `github.com/ArcBlock/blocklet-server/tree/master/core/blocklet-services` |
| 形态 | **Express 4 应用**（不是框架无关的库），由 blocklet-server 主进程 `require` 后挂到 `/.well-known/service` |

---

## 2. 它在架构里的位置【代码 `api/index.js`】

```js
const { WELLKNOWN_SERVICE_PATH_PREFIX, WELLKNOWN_BLOCKLET_ADMIN_PATH } = require('@abtnode/constant');
server.use(WELLKNOWN_SERVICE_PATH_PREFIX, bodyParser, ensureLocale({ force: true }));   // index.js:787
server.use(`${WELLKNOWN_SERVICE_PATH_PREFIX}${pathname}`, checkMemberPermission, proxyToDaemon({…}));  // :766
server.use(`${WELLKNOWN_SERVICE_PATH_PREFIX}${pathname}`, checkGuestPermission, proxyToDaemon({…}));   // :771
```

三件事决定了它的角色：

1. **每个 blocklet 一份**（按 `req.getBlocklet()` / `ensureBlocklet()` 解析当前 blocklet），不是全局单例；
2. 所有路径都在 `/.well-known/service` 前缀下，**因此它永远不该和 blocklet 自己的路由抢路径**（这也是 ArcBlog
   `docs/05-开发文档/02a` 把 `/.well-known/service/login` 列为唯一豁免的原因）；
3. 它同时承担**静态资源服务**（`dist/`）、**API**、**到 daemon 的反向代理**（`proxyToDaemon` + `http-proxy-middleware`）。

---

## 3. 服务端路由模块（前缀 → 职责）【代码】

| 模块 | URL 前缀 | 职责 | 关键端点（节选） |
| --- | --- | --- | --- |
| `routes/env.js` | `…/api/env` | **注入 `window.env`**（不是 `window.blocklet`）：`did/appId/appName/pathPrefix/apiPrefix/webWalletUrl/serverDid/serverVersion/mode/maxUploadFileSize/runtimeConfig/gateway…` | `GET …/api/env`（`res.type('js')`） |
| `routes/user.js` | `…/user` + `…/api/user` | 用户与会话主体：登录/登出/资料/隐私/邮箱验证码/通知/组织/关注 | `POST api/user/{login,loginByWallet,loginByLauncher,checkUser,checkToken,logout}`、`GET api/user/profile`、`PUT api/user/notification/webhook`、`GET/POST api/user/privacy/config`、`GET api/user/email/{status,test}`、`GET api/user/session`、`/api/user/spaceHosts`、`/api/user/refreshProfile`、`/api/user/updateDidSpace` |
| `routes/user-session.js` | `…/api/user-session` | 设备/会话管理（`ua-parser` 解析 UA） | 会话列表/撤销 |
| `routes/access-key.js` | `…/api/access-key` | **Access Key**（CLI/CI 用的长期凭证，配合 `…/gen-access-key` 授权页） | 创建/吊销 |
| `routes/oauth/{client,server}.js` | `…/oauth` + `…/api/oauth` | blocklet 既做 OAuth **客户端**也做 **Server** | 授权、回调、token |
| `routes/federated.js` | `…/api/federated` | 联邦登录（跨节点） | `/pullFederatedSites`、`/check-federated` |
| `routes/connect/{relay,session}.js` | `…/api/connect/relay` | DID Connect 的 relay/session（`@did-connect/*`） | approve / relay |
| `routes/media.js` | `…/media` | 上传与图床（`@blocklet/uploader-server`） | 上传、列表 |
| `routes/blocklet.js` | `/`（服务台根） | **blocklet 自身元信息与图形资产** | `/blocklet/logo{,-dark,-favicon,-rect,-rect-dark}`、`/blocklet/splash/{portrait,landscape}`、OG 相关 |
| `routes/sign.js` | `…/api/sign` | 服务端签名（`/derive`、`/eth`、`/jwt`）——给需要平台代签的 blocklet | |
| `routes/ocap.js` | — | OCAP/链相关（`@ocap/client|util|wallet`） | |
| `routes/mcp.js` | — | **把服务台能力暴露成 MCP 工具**（`@modelcontextprotocol/sdk`） | |
| `routes/openapi.js` / `opencomponent.js` / `openembed.js` / `openevent.js` | `…/openapi.{json,yml}`、`…/opencomponent.{json,yml}`、`…/openembed.{json,yaml}`、`…/openevent.json` | 四个"对外描述文件"：把服务台的 API / 可嵌入组件 / 事件做成**机器可读清单** | |
| `routes/csp-proxy.js` / `dns-resolver.js` | `…/api/dns-resolve/` | CSP 代理与 DNS 解析（安全/反 SSRF） | |
| `services/studio/index.js` | `…/studio` | Blocklet Studio 后端 | |
| `authRoutes.*`（来自 `@abtnode/auth`） | — | passport / passkey / common | `createPassportRoutes`、`createPasskeyRoutes`、`createCommonRoutes`（`/api/did/session`、`/api/did/logout` 就在这一族） |

静态与桥接【代码】：`…/static/**`（Vite 产物）、`…/static/share/workbox-v7.3.0/**`（PWA）、`…/share/shared-bridge.html`、
`…/openembed.json`、`…/openembed.yaml`。

---

## 4. 横切中间件与运行期机制【代码】

| 机制 | 文件 | 作用 |
| --- | --- | --- |
| `ensureBlocklet()` | `api/middlewares/ensure-blocklet.js` | 解析当前 blocklet（多数路由都要） |
| `checkUser` / `ensureOrgEnabled` | 同上 | 登录态与组织开关 |
| `checkMemberPermission` / `checkGuestPermission` | `api/index.js:766,771` | **成员/访客两级权限门**，再 `proxyToDaemon` |
| `bodyParser` + `ensureLocale({force:true})` | `api/index.js:787` | 所有服务路径下的 body 与 locale |
| `helmet` + CORS + CSP 源清单 | `api/index.js`（`DEFAULT_HELMET_CONFIG`、`CSP_*_SOURCES`） | 安全头 |
| 限流 | `@blocklet/rate-limit`、`createEmailLimiter` | 登录/邮箱类接口防刷 |
| 缓存 | `api/cache.js`、`@abtnode/db-cache` | |
| 事件总线 | `@arcblock/event-hub`（测试用 `/single`） | 服务台内部事件 |
| WebSocket | `@arcblock/ws` + `api/socket/**` | 实时通道 |
| 数据层 | `sequelize`（`Op`）、`@abtnode/models` | 用户/会话/通知等落库 |

**`api/socket/channel/`**：`did.js`、`hooks.js`、`component.js`、`eventbus.js`、`relay.js`、`app.js`
—— 分别对应身份、Webhook、组件、事件总线、DID Connect relay、应用通道。
**`api/services/auth/connect/`**（40+ 文件）是一整条 DID Connect 生命周期：`login / bind-wallet / issue-passport /
switch-passport / migrate-app-to-struct-v2 / rotate-key-pair / approve-vault / config-vault / verify-destroy /
destroy-self / connect-to-did-spaces-for-user / issue-kyc …`——**这就是"钱包即账号"的实现面**。
**`api/emails/**`** 用 `@react-email/components` 渲染事务邮件（验证码、活动通知、附件等）。

---

## 5. 前端产物 `dist/**`【代码】

- `dist/index.html`：Vite + PWA（`registerSW.js`、`manifest.webmanifest`），**`window.__toCdnUrl` 指向 `/.well-known/service/static/`**，
  并 `<script src="/.well-known/service/api/env">` + `<script src="/__blocklet__.js">`。
- `dist/assets/*`：按功能切块，可直接看出服务台有哪几页（名字即功能）：
  `team`、`profile-embed`、`branding`、`appearance`、`access-control`、`access-key`*、`audit-logs`、`authorize`、
  `bind-account`、`add-resource`、`add-component-core`、`advanced`、`api`、`app`、`ar`(i18n 阿拉伯语)…
  （`*` 由 `api/routes/access-key.js` 佐证）
- `dist/share/shared-bridge.html`：跨窗口共享桥。
- Service Worker：`workbox-v7.3.0`（离线/PWA）。

---

## 6. 依赖图（三组版本锁）【代码】

```
@abtnode/*        全部 = 1.17.12（analytics, auth, connect-storage, constant, core, cron, db-cache,
                  logger, models, router-templates, util）
@blocklet/*       全部 = 1.17.12（constant, env, images, js-sdk, meta, rate-limit, sdk, server-js）
                  + ^ 版本：dbhub, error, form-builder, form-collector, theme ^3.5.2, theme-builder,
                  uploader-server, xss
@arcblock/*       全部 = 1.29.27（did, did-connect-js, did-ext, did-util, event-hub, jwt, validator, ws）
                  + http-proxy ^1.19.1
其他关键：express ^4.18、sequelize(Op)、helmet 7、cors、cookie-parser、http-proxy-middleware 3、
        @modelcontextprotocol/sdk ^1.18、auth0 ^3.3、@react-email/components、jsonwebtoken、jwks-rsa、
        @did-connect/{authenticator,relay-adapter-express} 2.2.8、@ocap/{client,util,wallet}
```

【推断】这是一套**版本全面锁死的 monorepo 发布列车**（`1.17.12` 同时出现在 11 个 `@abtnode/*` 与 8 个 `@blocklet/*` 上），
所以它**不能被单独升级或单独引入**；任何集成只能通过 HTTP 契约，不能通过 `require`。

---

## 7. 一个 blocklet（1.x 时代）怎样与它集成

| 集成点 | 做法 | 证据 |
| --- | --- | --- |
| 运行环境 | 引入 `…/api/env`（得到 `window.env`）+ `/__blocklet__.js` | `dist/index.html` |
| 导航/个人中心菜单 | `blocklet.yml` 里声明 `navigation`（含 `section: userCenter`），在 `…/admin/navigation` 排序 | 官方文档《自定义个人中心页面》+ `@blocklet/ui-react` 的 `UserCenter` 读 navigation（见 [`02`](02-blocklet-ui-react-解剖.md) §3） |
| 用户中心 | `…/user`；组件 `<UserCenter>` 渲染页签 | `routes/user.js` `prefix = …/user` |
| 会话 | `…/api/did/session`、`…/api/did/logout` | `@abtnode/auth` 的 common routes（2.0 实测仍存在，见 [`03`](03-arc2-服务面实测.md) §1） |
| 头像 | `…/user/avatar/<did>`（`USER_AVATAR_URL_PREFIX`） | `routes/user.js` import `USER_AVATAR_URL_PREFIX`；2.0 实测可用 |
| Access Key（CLI/CI） | 授权页 `…/gen-access-key` + `…/api/access-key` | `routes/access-key.js` |
| Webhook / 通知 | `…/api/{user,notification}/webhook`、`socket/channel/hooks.js` | `routes/user.js:1365` |
| OAuth | `…/oauth` + `…/api/oauth` | `routes/oauth/*` |
| 对外描述 | `…/openapi.json`、`…/opencomponent.json`、`…/openembed.{json,yaml}`、`…/openevent.json` | 路由清单 |
| MCP | 服务台自带 MCP 端点 | `routes/mcp.js`（`@modelcontextprotocol/sdk`） |

---

## 8. 与 arc 2.0 的差异（结论）

| 维度 | 1.17.x（本包） | arc 2.0（实测） |
| --- | --- | --- |
| 宿主 | 独立 npm 包 + Express 4 | 编进 `arc` 二进制 |
| 环境注入 | `…/api/env` → `window.env` | `/__blocklet__.js` → `window.blocklet` |
| 静态产物 | `…/static/assets/**` | `…/assets/**` |
| 菜单配置页 | `…/admin/navigation` | **404** |
| 头部 | React（`@blocklet/ui-react` 的 `Header`） | 原生 Web Component `<blocklet-header>` |
| 主题 | `@blocklet/theme` / MUI | `web-mode` + `arc_mode` cookie + `--blocklet-*` |

**结论**：把本包当作**"节点服务面该提供什么"的清单**（登录/会话/头像/个人中心/通知/Access Key/OAuth/Webhook/审计/组件/Studio/MCP），
**不要**把它的 URL 或依赖写进 ArcBlog。arc 2.0 上真正存在的子集见 [`03`](03-arc2-服务面实测.md) §1。

---

## 9. 对 ArcBlog 的三条可执行结论

1. **我们今天只用了其中 2 个能力**：`…/login`（登录跳转）与平台内置的 `user-menu`。
   本包提示还有：**头像**、**通知**、**Access Key**、**Webhook**、**会话管理**——前两个 ArcBlog 现在就能用（见 [`04`](04-ArcBlog-改进建议.md) P0-2）。
2. **"每 blocklet 一份服务台"是个好范式**：ArcBlog 自己的 `?page=*` 控制台可以照它的分层——
   `API 前缀 + 权限中间件 + 机器可读描述文件`，而不是把逻辑塞进页面。ArcBlog 已有 `scripts/arcblog-*.mjs` 作为"CLI 优先"的等价物。
3. **审计/权限是显式资源**：本包把 `audit-logs`、`access-control` 做成独立页面与路由；
   ArcBlog 有 `arcblog-audit.mjs` 与权限矩阵（`blocklet.yaml` 的 `networkRead`/`replicated` + `arcblog-permissions.test.mjs`），思路一致，可对照补齐"谁能读哪条"的自述文档。

---

## 10. 未验证

1. `…/studio` 的完整契约（`services/studio/index.js`）未逐行读；
2. `opencomponent/openembed/openevent` 三份描述文件的 schema 未展开；
3. 1.17.x 与 2.0 在**通知**与 **Access Key** 上的端点差异未逐条实测（2.0 侧只实测了 `/gen-access-key` 200）。
