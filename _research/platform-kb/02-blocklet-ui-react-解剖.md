# 02 — `@blocklet/ui-react@3.5.4` 解剖

> **材料**：`npm pack @blocklet/ui-react@3.5.4` → 解包 221 个文件（`package/lib/**`，ESM 源码 + 同名 `.d.ts`）。
> **等级**：本文件所有结论都标了【实测】（命令）/【代码】（读到的字面实现）/【推断】/【未验证】。

---

## 1. 包身份（`package.json`）【代码】

| 字段 | 值 | 含义 |
| --- | --- | --- |
| `name` / `version` | `@blocklet/ui-react` / `3.5.4` | |
| `main` / `module` | 都是 `lib/index.js` | **只有 ESM**，没有 CJS 入口 |
| `types` | **不存在** | `package.json` 没声明类型入口，但 `lib/**/*.d.ts` 是齐的（`lib/index.d.ts`）⇒ 只能靠 bundler/TS 的路径推断 |
| `exports` | **不存在** | 因此**子路径导入可用**（README 就是 `@blocklet/ui-react/lib/Header`） |
| `sideEffects` | `false` | 可 tree-shake |
| `files` | `["lib"]` | 只发 `lib` |
| `peerDependencies` | `react ^19`、`react-router-dom ^6.30.3`、`@mui/material ^7.2`、`@mui/icons-material ^7.2`、`@emotion/react ^11.14`、`@emotion/styled ^11.14`、`@arcblock/ux ^3.1`、`@arcblock/did-connect-react ^3.1`、`@blocklet/js-sdk ^1.17.12` | **9 个 peer**：宿主必须自己装 React 19 + MUI 7 + emotion + router + 两个 ARC 包 + js-sdk |

【实测】`find lib -name '*umd*' -o -name '*iife*' -o -name '*.min.js'` → **空**：没有 UMD/IIFE 产物，**不能 `<script src>` 直接用**。

---

## 2. 导出清单【代码，`lib/index.js`（12 个具名导出）】

| 导出 | 目录 | 一句话职责（读代码得出） |
| --- | --- | --- |
| `Header` | `lib/Header/index.js` | 页面头：读 `window.blocklet` 的 logo/名称/`navigation` 渲染导航；**上层有 Session Context 就自动渲染身份按钮**，有 Locale Context 就渲染语言切换（README 原话） |
| `Footer` | `lib/Footer/index.js` | 页脚；同样读 `window.blocklet` |
| `Dashboard` | `lib/Dashboard/index.js` | 管理台外壳：`SessionContext` + `@arcblock/ux/lib/Layout/dashboard` + `formatBlockletInfo/getLocalizedNavigation/filterNavByRole`（**菜单按角色过滤**） |
| `Icon` | `lib/Icon/index.js` | 图标封装 |
| `ComponentInstaller` / `CheckComponent` / `AddComponent` / `PublishComponent` | `lib/ComponentInstaller/`、`lib/ComponentManager/` | 组件（子应用）安装/发布流程 |
| `useComponentInstaller` | `lib/ComponentInstaller/use-component-installed.js` | 上面这套的 hook |
| `BlockletStudio` | `lib/BlockletStudio/index.js` | Blocklet Studio 面板 |
| `UserCenter` | `lib/UserCenter/components/user-center.js` | **个人中心容器**（见 §3） |
| `UserSessions` | `lib/UserSessions/components/user-sessions.js` | 会话/设备管理（`ua-parser-js` + Datatable + 逐个撤销） |

**没在入口导出、但可作为子路径使用的**（`lib/` 下有目录）：`lib/Notifications`（通知，`lib/Notifications/utils.js` 引 `@blocklet/js-sdk`）、
`lib/hooks/use-follow.js`、`lib/contexts/*`（`config-user-space`、`user-followers`）、`lib/blocklets.js`（`formatBlockletInfo`、`getLocalizedNavigation`、`filterNavByRole`）。

---

## 3. `UserCenter` 契约【代码，`lib/UserCenter/components/user-center.d.ts`】

```ts
function UserCenter(props: {
  children: any;                 // 自定义内容（蓝色内容区）
  notLoginContent?: any;         // 未登录时显示什么
  currentTab: string;            // 必填：当前页签（官方示例传 window.blocklet.prefix）
  contentProps?: BoxProps;
  disableAutoRedirect?: boolean;
  autoPopupSetting?: boolean;
  hideFooter?: boolean;
  headerProps?: any;
  footerProps?: any;
  userDid?: string;              // 不传则用当前会话
  stickySidebar?: boolean;
  embed?: boolean;               // 嵌入模式（配合 with-hide-when-embed）
  onlyProfile?: boolean;         // 只显示 Profile（官方注释：给 ArcSphere 用）
  onDestroySelf?: () => void;    // 注销（销毁自身）
}): JSX.Element | null
```

行为（读 `user-center.js`）：

| 事实 | 证据 |
| --- | --- |
| 登录态来自 `@arcblock/did-connect-react/lib/Session` 的 `SessionContext` | `user-center.js` 顶部 import |
| 页签由 **blocklet 声明的 navigation** 决定，内置 4 个专属页签：`/userCenter/nfts`、`/userCenter/user-followers`、`/userCenter/settings`、`/userCenter/did-spaces`（也认链接 `/nfts`、`/settings`、`/did-spaces`、`/user-followers`） | 同上文件里 `Ze()` 的数组 |
| 翻译用 `@arcblock/ux/lib/Locale`，并自带 `libs/locales.js` | 同上 |
| 读 `window.blocklet`（logo/名称等） | `grep -rl window.blocklet lib/` 命中 `user-center.js` |
| js-sdk 用的是**包内 vendored 副本**：`../../node_modules/@blocklet/js-sdk/dist/index.js` | 同上 import；`lib/node_modules/` 下只有 `@blocklet/` |

【推断】官方文档《自定义个人中心页面》里 `navigation: [{id: profile, section: [userCenter]}]` + `<UserCenter currentTab={window.blocklet.prefix}>` 那套，
在代码上就是"**blocklet 的 navigation 声明 → UserCenter 页签**"，也就是说个人中心的自定义入口是**声明式**的。

---

## 4. 依赖与运行前提【代码】

- **9 个 peer**（§1）：React **19**、MUI **7**、emotion 11、react-router-dom 6.30、`@arcblock/ux` 3.1、`@arcblock/did-connect-react` 3.1、`@blocklet/js-sdk` 1.17。
- 其它硬依赖（非 peer，需宿主解析）：`ahooks`、`lodash`、`prop-types`、`react-error-boundary`、`react-helmet`、`ufo`、`axios`、`ua-parser-js`、`p-queue`、`p-wait-for`、`clsx`、`iconify-icon`、`dayjs`、`dompurify`、`notistack`、`react-placeholder`、`validator`、`js-cookie`、`type-fest`、`@iconify/react` + 4 个图标集。
- 数据来源：`window.blocklet`（应用元信息、navigation）+ `SessionContext`（会话）+ `@blocklet/js-sdk`（RPC/通知）。
- 主题：`@arcblock/ux/lib/Theme`（`styled`、`useTheme`、`deepmerge`、`ThemeProvider`）——即 **MUI 主题体系**，不是 CSS 变量。

---

## 5. 与 `@abtnode/blocklet-services` 的关系【推断 + 实测】

`@abtnode/blocklet-services@1.17.12` 的 `dist/assets/*.js` 里能看到同一批功能名（`team`、`branding`、`access-control`、`audit-logs`、`appearance`、`profile-embed`、`authorize`、`actions`、`add-resource`…），
且它的 `package.json` 指向 blocklet-server 仓库 `core/blocklet-services`。
⇒ 【推断】1.17.x 时代的"服务台 UI" = `@blocklet/ui-react` 的组件 + `@abtnode/blocklet-services` 的壳与 API。

**版本列车**（从 peer/依赖范围读）：

```
@blocklet/ui-react 3.5.4
   └─ peer @blocklet/js-sdk ^1.17.12、@arcblock/ux ^3.1、@arcblock/did-connect-react ^3.1
@abtnode/blocklet-services 1.17.12
   └─ dep  @blocklet/sdk ^1.17.12、@abtnode/{constant,util} ^1.17.12、@arcblock/bridge|icons|react-hooks 3.5.4
```

**而本机跑的是 arc `2.0.0-beta.66`**：服务台已重写成原生 Web Component（`<blocklet-header>`）+
`/_arc` 运行时（实测 `/api/env`、`/static/**`、`/admin/navigation` 全 404）。
⇒ 【推断】**3.5.4 / 1.17.12 这一列车对应的是 1.17.x 平台代次，不是 arc 2.0**。

---

## 6. 对 ArcBlog 的可用性判定

| 问题 | 判定 | 依据 |
| --- | --- | --- |
| 能在 AUP DSL 页面里用吗？ | **不能** | 这些页面不是 React；AUP 原语表里也没有 React 挂载点（`view/text/afs-list/…`） |
| 能当 `<script src>` 引入吗？ | **不能** | 无 UMD/IIFE 产物，且 peer 依赖 9 个包 |
| 能在 `.web/components/<name>/script.js` 里用吗？ | **理论可以、实践不建议** | 该脚本会被内联进 SSR 页面（`arc-contracts` §14 实测）；但要做就得自带 React 19 + MUI 7 + emotion + router 的产物，等于往"零依赖"仓库里塞一个前端运行时，且没有 bundler |
| 能当**设计参考**吗？ | **可以，且值得** | `UserCenter` 的页签分区（profile / settings / nft / did-spaces / user-followers）、`Header` 的 addons 插槽、`Dashboard` 的 `filterNavByRole` 都是现成的信息架构 |
| 能当 arc 2.0 的依赖吗？ | **不能** | 版本列车不同（§5），2.0 服务台已换实现 |

**结论**：把 `@blocklet/ui-react` 定位为**参考实现 + 契约字典**，不要引入依赖。
如果哪天真的需要 React 面，正确做法是**新开一个带 bundler 的 web 应用**（属于产品决策，不在现有纪律内）。

---

## 7. 未验证 / 需要探针

1. 3.5.4 是否与 arc 2.0 的 `window.blocklet` 形状完全兼容（我们在 2.0 上枚举到 43 个顶层键，未见字段缺失，但没跑过 React 组件）。
2. `lib/Notifications`、`lib/hooks/use-follow` 是否依赖 `@blocklet/js-sdk` 的 1.17 接口（2.0 是否同形）。
3. `Dashboard` 的 `filterNavByRole` 在 2.0 的 navigation（`window.blocklet.navigation: []`）下行为如何。
