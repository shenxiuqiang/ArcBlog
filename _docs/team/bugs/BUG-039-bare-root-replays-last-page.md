# BUG-039: 裸根路径 `/` 会重放本会话最后一次 `?page=` 页面（既有平台行为，非 REQ-028 引入）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-039 |
| 严重级 | **P2**（体验：公开首页可能被上一个 `?page=` 页面顶替；不阻断 REQ-028，也不影响任何数据/权限） |
| 发现轮次 | round-16（QA 独立复跑，`task-68`） |
| 关联 REQ | **范围外**（既有行为，REQ-028 未引入；对 `?page=dashboard` / `?page=about` 同样成立） |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：daemon 在跑（`arc service status`），站点 `http://arcblog.localhost:4939`。
2. 用**同一个浏览器标签页**依次访问：`/` → `/?page=saved` → `/`（每次都等页面加载完）。
3. 观察第 3 步落到哪里（`location.href` + 页面标题）。

```bash
# 无头复现（QA 用的真实命令；单 tab + Page.navigate 换页）
node docs/team/test-reports/raw/REQ-028-qa-home-route.mjs
```

## 期望

`Page.navigate` 到 `http://arcblog.localhost:4939/`（无 `page=` 参数）时渲染**首页**（`最新发布` / `Latest published`），就像全新会话里直接访问 `/` 那样（同一脚本的 scenario A 与 `sessionStorage.clear()` 之后的场景都是首页）。

## 实际

在同一个标签页里，只要本会话访问过**任意** `?page=<x>`，再访问裸 `/` 就会重放 `<x>`，并把 URL 改写成 `/?locale=zh&page=<x>`：

- `?page=saved` → `/` 之后仍是「阅读清单」；
- `?page=dashboard` → `/` 之后仍是「仪表盘」；
- `?page=about` → `/` 之后仍是「关于 ArcBlog」；
- `/posts/hello-arcblog` → `/` 之后变成 `?page=reader` + 文章内容。

机制（实测）：`page` 与 `locale` 保存在 **AUP 会话状态**里（`sessionStorage` 只有一条 `afs:web:session:…` 句柄；`sessionStorage.clear()` 后再访问 `/` 就回到首页，且 locale 退回默认 en）。这不是 REQ-028 新页面特有的：`?page=dashboard` / `?page=about` 在 REQ-028 之前就存在，行为相同。

**影响面**：站内所有入口都带显式 `?page=`（wrapper 品牌链接 `href: "/?page=index"`），所以正常点击不会踩到；踩到的是「在 URL 栏直接输根域 / 打开指向 `/` 的书签」这类入口 —— 用户会停在上一页（例如新增的页脚入口 `/?page=saved` 之后回根域会看到「阅读清单」登录门）。

## 证据输出

```text
$ node docs/team/test-reports/raw/REQ-028-qa-home-route.mjs
== A: direct / in a fresh tab
  -> / | landed: /?locale=zh | h2: 最新发布
== B: /?page=saved then /
  -> /?page=saved | landed: /?page=saved&locale=zh | h2: 阅读清单
  -> / | landed: /?locale=zh&page=saved | h2: 阅读清单
== C: /?page=dashboard then /
  -> /?page=dashboard | landed: /?page=dashboard&locale=zh | h2: 仪表盘
  -> / | landed: /?locale=zh&page=dashboard | h2: 仪表盘
== D: /?page=about then /
  -> /?page=about | landed: /?page=about&locale=zh | h2: 关于 ArcBlog
  -> / | landed: /?locale=zh&page=about | h2: 关于 ArcBlog
== G: / then /?page=saved then /posts/hello-arcblog then /
  -> / | landed: /?locale=zh | h2: 最新发布
  -> /?page=saved | landed: /?page=saved&locale=zh | h2: 阅读清单
  -> /posts/hello-arcblog | landed: /posts/hello-arcblog?locale=zh | h1: Hello ArcBlog
  -> / | landed: /?locale=zh&page=reader | h1: Hello ArcBlog
```

会话句柄证据（同一脚本 `REQ-028-qa-home-route-ss.mjs`，原始 JSON 见 `docs/team/test-reports/raw/REQ-028-qa-home-route-ss.json`）：

```text
before    href=/?locale=zh                 h2=最新发布     sessionStorage keys=[afs:web:session:http://arcblog.localhost:4939:bl:arcblog]
onSaved   href=/?page=saved&locale=zh      h2=阅读清单     sessionStorage keys=[同一句柄]
backHome  href=/?locale=zh&page=saved      h2=阅读清单     sessionStorage keys=[同一句柄]
afterClear（sessionStorage.clear() 后再访问 /）  href=/   h2=Latest published   ← 新会话 → 首页
```

退出码：0（脚本自身正常结束；现象是渲染结果，不是命令失败）

## 影响范围

- 受影响角色：guest、已登录用户（两者都复现；guest 场景见 `REQ-028-qa-footer.mjs` 与 `REQ-028-qa-home-route.mjs`）
- 受影响链路：SSR/AUP 首页路由（`/` 的初始页面解析）
- 数据后果：无（只影响渲染与 URL，不写任何 AFS 记录）
- 可绕过：是 —— 所有站内链接都带显式 `?page=`；受影响入口只有「手动输入/外部指向 `/`」；也可由「进入 `/` 时强制 page=index」的根路由修正

## 疑似文件

- `docs/arc-contracts.md`（可增补一条「AUP 会话保存当前 page，裸 `/` 会重放」的实测事实 —— 由 Lead 落笔，QA 不改）
- `.aup/wrapper.aup`（品牌链接已带 `?page=index`，是当前的绕过形态）
- 不指向任何源码修复：这是平台会话行为，是否在 ArcBlog 侧兜底由 PM/Lead 裁决
