# 控制台 §9 页面验收走查（Round 6 / UI-001）

> 所有者：**UI** ｜ 上游：[`docs/ArcBlog-admin-ui-design.md`](../ArcBlog-admin-ui-design.md) §9（页面验收清单，另引 §2.2/§2.4/§2.6/§3.3/§3.4/§4.1/§4.3/§4.4/§5.1/§5.3/§8）· spec §15.1–§15.10 · [`docs/arc-contracts.md`](../arc-contracts.md) §14/§17/§19/§20/§23–§25 ｜ 下游：PM（建 Dev 任务）、Lead（标准漂移裁定）、QA（复核可观察行为）
> 对应提案：[`UI-001-console-tokens-and-walkthrough.md`](UI-001-console-tokens-and-walkthrough.md)（发现项 F1–F13 / U1 / D1–D4 / Q1）

---

## 0. 范围、方法与快照

- **范围**：全部控制台页面 = `scripts/console-nav.mjs` 的 `CONSOLE_SECTIONS`。本轮实测时该模型是 **16 页**（`dashboard,posts,pages,compose,heroes,categories,seo,feeds,appearance,operations,hub,media,agents,policy,access,factory`）；走查进行中 Dev 把 `tags` 加进模型（**17 页**），故新增页 `tags` 单独标注。
- **方法**：
  1. **静态**：读 `.aup/pages/**` 源码与 `arc dsl generate` 产物，逐条比对标准；行号见证据列。
  2. **运行期（只读）**：共享调试 Chrome `:9333`（`/json/new` + WebSocket CDP）——admin 会话（`Testadmin`）跑 `http://arcblog.localhost:4939/?page=<name>`；访客态用 `Target.createBrowserContext` 造**无 cookie 上下文**。**未点击任何写操作**。
  3. **Hero（公共站）**：`/p/en/hero-carousel/` + 真实 Tab 按键走查焦点（U1）。
- **快照**：2026-09-27 19:0x，`git HEAD = b751d9f`；工作区含 Dev 本轮在飞改动（`?? .aup/pages/site/tags.aup`、`M scripts/console-nav.mjs`、`M scripts/arcblog-tags.mjs` 等）。视口 1803×908（控制台）/ 1440×900（Hero 截图）。
- **重要前提**：`?page=tags` 在本轮走查时**未上线**（`curl` 200 但运行期把未知页归一化到首页，实测 `?page=tags` 渲染 `h2=Latest published`，`active` 行为空）→ `tags` 页只做**源码级**走查，运行期结论一律记「无法判定（未上线）」。

---

## A. §9 十二条逐项结论

| # | §9 条目 | 结论 | 证据（可复现） | 例外/不适用 |
| - | ------- | ---- | ------------- | ---------- |
| 1 | 骨架：侧栏由 console-nav 生成，`--check` 通过 | **符合** | `scripts/console-nav.mjs` 是唯一菜单模型；`node scripts/arcblog-console-nav.mjs --check` 由 `scripts/arcblog-console-nav.test.mjs` 守；实测每页侧栏宽 270px @1803（= `clamp(200px,15vw,280px)`），**恰好 1 行** `data-active="true"` 且 `aria-current="page"`（16 页逐页实测，行名与页面一一对应）。本轮 Dev 改模型后需重跑 generate（见 A19） | — |
| 2 | 布局：100% 流式；页面固定无纵向滚动条；滚动只在 console 内（无双滚动条） | **符合** | 实测每页 `documentElement.scrollHeight === clientHeight`（908/908）；需要滚动的页**只有一个** `overflowY:auto` 容器：posts 749/2749、heroes 714/1192、factory 860/1405、compose 908/1818；其余页内容不溢出。顶栏 `100vw` 全出血（实测 w=1803 @x=0, h=48）；17 页根 `view` 均 `overflow: visible`（`arc-contracts.md` §24） | — |
| 3 | 页头：标题 + 一句话说明 + 至多一个主操作 | **不符合** | ① `?page=compose` 可见 `h2` = **0**（源码 `.aup/pages/admin/compose.aup` 无 `h2 :title`/`desc`，首屏是 `h3 :checks`）；② `?page=appearance` 两个可见 `h2` 同为 `Appearance`（`:89` + `:91` 的 auto-surface）；③ `?page=posts` 同屏 **30 个** `data-variant="primary"`（实测表达式见提案 A6），`?page=pages` 同形（源码 `:124` + `:152`）。其余 13 页各自有 1 个页面标题 `h2`（`dashboard`/`operations`/`policy` 另有卡片/区块 `h2`，§3.4 允许）与 0–1 个可见主操作 | `feeds`/`operations`/`hub`/`media`/`agents`/`policy`/`access` 当前 0 个 primary（无写操作入口）——符合「最多一个」 |
| 4 | Token：无硬编码颜色 / 字号 / 间距 / 圆角 | **不符合（间距维度）** | 颜色、字号、圆角**全绿**：17 页 + `wrapper.aup` 的 `grep -E '#[0-9a-fA-F]{3,8}\|rgba?\('` = 0 命中；`fontSize: "<数字>px"` = 0 命中；按钮统一 `borderRadius: "var(--radius-md, 8px)"`（347 个控制台 action 中 341 个内联声明；未声明的 6 个 = `compose.aup` 2 + `compose-edit.aup` 4）。**间距**：**17 个菜单页各 1 处** gate 卡 `padding: "20px"`（标准为 14px；绑定页 `compose-edit` 的 gate 反而是 `var(--space-block, 16px)`），`compose` 5 张卡 / `compose-edit` 7 张卡是 `padding: var(--space-block, 16px)`（运行期 20px）+ `gap=md`(20px)；实测 `?page=compose` 5 张卡 pad 全 `20px`、gap 全 `20px`。对照组：`?page=dashboard` 6 卡、`?page=posts` 3 卡实测 pad `14px` / gap `10px` / radius `10px` / shadow `none` | 网格配方偏差另见条目 11 与提案 F7 |
| 5 | 状态：空状态有引导和动作；加载有骨架；错误三要素齐全 | **不符合** | ① **空状态文案不可本地化**：运行期实测 `?page=dashboard|pages|media|agents` 各出现 1 处英文 `No items to display`（`arc-contracts.md` §20：`emptyText=:key` 不求值）→ 中文站点出现英文；② **部分页无兜底引导**：`dashboard:132,148,158`、`posts:143,158`、`hub:112` 的列表之后没有任何 dim 引导（`categories:118` 的 `cat-slug-hint`、`heroes` 的 `hero-id-hint/-quickadd-hint` 属于其后的新建表单，不是空态引导）——对照：`agents:114-116`、`media:107`、`pages:146,160`、`operations`、`access`、`policy`、`factory`、`tags:150-155` 有；③ **加载**：列表型有运行期骨架，`propBind` 单记录卡首屏竞态仍在（`arc-contracts.md` §21.11，dashboard 节点卡）；④ **错误三要素**：`hub`/`operations`/`access` 把 `failed` 等原始字段直接打印，没有「为什么 + 怎么办」 | `feeds`/`appearance`/`compose*`/`seo` 无列表型空态，条目不适用 |
| 6 | 双编码：状态不只依赖颜色 | **不符合** | 行内状态是**裸英文枚举文本、且无状态点**：`?page=posts` 实测 innerText 含 `published`/`archived`/`deleted`（源码 `posts.aup:145,161`）；`?page=hub` 含 `failed`；`?page=access` 含 `paid`；本轮新增 `tags.aup:176,178`（`action`/`status`）同形。**符合的对照**：`?page=dashboard` 实测有 2 个 `●` 状态点 + 文字 | — |
| 7 | 数据：DID/哈希中间截断可复制；金额带符号；时间相对+绝对 | **不符合** | ① 控制台实测**复制入口 0 个**（文本/`title` 命中 `copy\|复制` = 0）；`?page=dashboard` 节点标识以 mono 全量渲染（`dashboard.aup:113`）；② 金额：`?page=policy`/`access` 有金额字段但未见统一的「金额 + 资产符号」成对渲染（本实例数据为空，**部分无法判定**）；③ 时间：只有 `dashboard:136`、`operations:111,118,132`、`agents:105`、`tags:128` 用 `time … timeMode=relative`，实测 dashboard 渲染出 `9 days ago` 等；`posts`/`pages`/`media`/`hub`/`factory` 列表行无时间 | 金额一项标「无法判定」：需非空订单/结算数据才能测 |
| 8 | 权限：无能力即隐藏；锁定字段附原因；匿名只见登录卡 | **符合（有一处文案错误）** | ① 匿名态实测：sidebar 行数 = 0、无 `console-pane`、无任何后台数据骨架，只有 gate 卡（16 页逐页 + `?page=posts|dashboard|pages|agents|media|compose`）= §6 要求；② 隐藏而非置灰：左侧栏整体 `visible=$session.authenticated`，能力菜单由 `console-nav` 模型决定；③ 锁定字段附原因：`tags` 页 `f-hint`、`worker-note`（源码）✓；④ **文案错误**：`?page=posts` 访客 gate 标题实测 `运维`（源码 `posts.aup:29-30`），与本页语义不符（提案 F1） | ⑤「非管理员会话按 guest 计」是平台行为（`arc-contracts.md` §13、admin-ui-design §8 末行），本轮未构造非 admin 的已登录会话 → 该子项**无法判定** |
| 9 | 打断：无「成功」弹窗；不可逆操作有确认且说明后果 | **符合** | `grep` 全 17 页：写操作一律 `onSuccessToast={intent: success, …}`（行内轻提示，非弹窗）；不可逆/写操作带 `confirm={title: :…, message: :…}`：`posts:167,171`（publish/delete）、`pages:152`、`hub`、`factory`、`tags:166`（queue rename/merge）。文案说明后果（如 `posts.admin-unpublish-msg`「归档先保留副本…」） | 未点击执行，确认框的**交互**未验证（只核对了标记与文案） |
| 10 | i18n：中英文布局都成立；无写死宽度 | **部分符合** | ① 文案全部走页面作用域 key，`npm test` 的 i18n 门（无死键、en/zh 键集一致）通过；② **但**行内裸枚举（条目 6）与运行期英文空文案（条目 5）会出现在中文界面；③ **写死宽度**：`.aup/pages/**` 里 `width: "<数字>px"` 只命中 1 处 `index.aup:23`（`240px`，公共首页，非控制台），控制台侧栏是 `clamp()`、内容列 `flex:1` → 控制台无写死宽度；④ 未做真实的 zh/en 双语几何对比（本轮只跑了当前 locale）→ 「中英布局都成立」标**部分无法判定** | 需要一次 `?locale=zh` / `?locale=en` 的双跑几何对比才能完整判定 |
| 11 | 克制：没有为填满空间而存在的内容 | **符合（新增页有一处）** | 17 页均为「页头 + 卡片/列表」，未见装饰性图表/凑数数字；`?page=dashboard` 只放状态与最近 5 条；`tags` 页有 `queue-legend`（必要的枚举释义）。**唯一偏差**：`tags.aup:176` 用 `scale=lg` 放大动作名，抢层级（提案 F13） | — |
| 12 | 点击去向（§2.6）：框架内切换；公共页/非 HTML 资源新标签页；内容区不存在会替换整页的链接 | **符合（口径本身不可执行，见 D1）** | ① 侧栏是 `action -> page <name>`（按钮，无箭头、满宽）；② 实测 `?page=posts` 主内容滚动容器内 61 个可见 `a` **全部有 `target`**；③ 全站唯一无 `target` 的 `a` 是 wrapper 的 `#site-header` 品牌链接（`href="/"`，属框架 chrome，不在内容区）→ 结论：内容区不存在整页替换链接。④ `/posts/<slug>`、`/preview/<slug>`、`/edit/<slug>`、RSS 均 `target=_blank`（源码） | §9 原文口径用 `[data-aup-id="console-pane"]` 查询，该 id 已不再生成（生成器 id-less，`arc-contracts.md` §25.3）→ **口径本身无法执行**，本轮改用「主内容滚动区内的 `a`」（提案 D1） |

---

## B. 逐页速查（admin 会话实测，视口 1803×908）

> `doc` = `documentElement.scrollHeight/clientHeight`；`scroll` = 主内容滚动容器的 `clientHeight/scrollHeight`；`active` = 唯一 `data-active=true` 行；`prim` = 可见 `data-variant=primary` 数量（`[labels]`）；`a(无target)` = 主内容滚动容器内可见链接数（无 target 数）；`空态兜底` 查的是列表**之后**是否有 dim 引导节点；`裸枚举` = `document.body.innerText` 命中英文枚举词。

| 页面 | doc | scroll | active | 可见 h2 | prim | a(无target) | 空态兜底 | 裸枚举 | 结论 |
| ---- | --- | ------ | ------ | ------- | ---- | ----------- | -------- | ------ | ---- |
| `?page=dashboard` | 908/908 | — | Dashboard | Dashboard / Recent published / Economy / Agent grants / Quick actions | 1 `[Write a post]` | 0(0) | ✗（仅单记录 node 卡有） | published, paid | 页头 ✓、主操作 ✓、空态 ✗ |
| `?page=posts` | 908/908 | 749/2749 | Studio | Your studio / Your content | **30** `[New post, Publish]` | 61(0) | ✗ | published, archived, deleted | 主操作 ✗✗、状态双编码 ✗ |
| `?page=pages` | 908/908 | — | Pages | Pages | 1 `[Create (offline)]` | 0(0) | ✓（online/offline-hint） | — | 源码里另有行内 primary（列表空时不可见），标记层面同 F2 |
| `?page=compose` | 908/908 | 908/1818 | Write | **0** | 1 `[Publish]` | 1(0)* | n/a | published, draft | **页头 ✗**、卡片 20px ✗（*唯一无 target 的 a 是 wrapper 品牌链接） |
| `?page=heroes` | 908/908 | 714/1192 | Heroes | Hero management | 1 `[Add hero]` | 0(0) | 部分（仅 hint） | published, draft | 页头 ✓ |
| `?page=categories` | 908/908 | — | Categories | Categories | 1 `[Add category]` | 0(0) | 部分（slug-hint） | — | 页头 ✓ |
| `?page=seo` | 908/908 | — | SEO | SEO | 1 `[Save]` | 0(0) | ✓（profile-empty，单记录） | — | 页头 ✓ |
| `?page=feeds` | 908/908 | — | Feeds | Feeds | 0 | 0(0) | n/a | published | 页头 ✓、无主操作（只读页） |
| `?page=appearance` | 908/908 | — | Appearance | **Appearance / Appearance** | 0 | 0(0) | n/a | — | **重复 h2 ✗**；token 卡 0 张（auto-surface 自管样式） |
| `?page=operations` | 908/908 | — | Operations | Operations / Node health / Discovery document / Registered Hubs | 0 | 0(0) | ✓（hubs-empty/discovery-empty） | — | 页头 ✓ |
| `?page=hub` | 908/908 | — | Hub console | Hub console | 0 | 0(0) | ✗ | failed | 状态双编码 ✗、空态 ✗ |
| `?page=media` | 908/908 | — | Media | Media | 0 | 0(0) | ✓（media-empty） | — | 页头 ✓ |
| `?page=agents` | 908/908 | — | Agents | Agent grants | 0 | 0(0) | ✓（agent-grants-empty 等） | — | 页头 ✓ |
| `?page=policy` | 908/908 | — | Policy | Split policy / Settlement policy / Products | 0 | 0(0) | ✓（products-empty） | — | 页头 ✓（3 个 h2 均为卡片/区块标题，非页面标题重复） |
| `?page=access` | 908/908 | — | Access | Access grants | 0 | 0(0) | ✓（grants-empty） | paid | 状态双编码 ✗ |
| `?page=factory` | 908/908 | 860/1405 | Factory | Node NFT | 1 `[Buy / mint]` | 0(0) | ✓（chain-empty/node-empty/worker-hint） | pending | 页头 ✓ |
| `?page=tags`（源码级） | 未上线 | 未上线 | 未上线 | 未上线 | 1 断言：空态/表单两 primary 由 `visible` 互斥 | — | ✓（`empty-title/body/write` 标准空态卡） | pending/done/noop/failed（源码） | **运行期无法判定**；源码级：空态 ✓、主操作互斥 ✓、网格配方 ✗（F7）、枚举+无点 ✗（F5/F13）、源标签自由文本（F12） |

---

## C. 无法判定 / 受限项（如实标注，不作通过推断）

| 项 | 为什么不能判定 | 需要什么才能判定 |
| -- | -------------- | ---------------- |
| `?page=tags` 的运行期表现（§9 全部条目） | 菜单已加 `tags` 但页面未 `arc dsl generate --write` / `arc blocklet build` / 重启；实测 `?page=tags` 被归一化到首页（渲染 `h2=Latest published`） | Dev 完成生成 + build + restart 后，按提案 A11/A16/A17 复测 |
| 非管理员**已登录**会话的权限边界（条目 8 子项） | 共享调试 Chrome 是 admin；访客上下文未登录，无法构造「已登录但非 admin」 | 一个非 admin 登录会话（或按 admin-ui-design §8 末行接受平台行为为既定降级） |
| 行内写操作的真实执行（Publish / Delete / 入队 worker 等） | 本轮走查**只读**，未点击任何写操作（避免污染实例） | 由 QA 在 REQ/任务口径下执行；或 UI 提供操作脚本由 Dev/QA 跑 |
| 金额「金额 + 资产符号」成对渲染（条目 7） | 本实例 `products`/`orders`/`settlements` 无可用金额数据（实测页面内无金额文本） | 用 CLI 造一条订单/商品后复测 |
| 中英双语几何对比（条目 10 后半） | 本轮只跑当前 locale（zh） | `?locale=zh` 与 `?locale=en`（或 `?page=x&locale=en`）各跑一次几何/换行断言 |
| 主题闪烁（提案 Q1） | 本机 `prefers-color-scheme: light = true`，`data-mode` 稳定 `light` → **本机无闪**；无法在本机复现深色偏好访客 | 一台深色偏好系统（或 Chrome `Emulation.setEmulatedMedia` 设 `prefers-color-scheme: dark`）下逐页切换测量 `data-mode` 回退窗口 |
| §9 条目 12 的原文口径 | `[data-aup-id="console-pane"]` 已不存在（生成器 id-less） | Lead 裁定改写 §9 口径（提案 D1），之后按新口径回归 |

---

## D. 与 spec §15 的功能面（D 组）对照（Round 6 关注点）

> 只记录「界面是否存在 + 是否可被 §9 验收」，不判功能对错（那是 QA 的范围）。

| spec 章节 | 界面落点 | 状态 | §9 可验收？ |
| --------- | -------- | ---- | ----------- |
| §15.3 概览 | `?page=dashboard` | ✅ 存在 | 空态兜底缺（F3），其余基本符合 |
| §15.4 文章 | `?page=posts` + `?page=compose` + `/edit/<slug>` | ✅ 存在 | 主操作 ✗（F2）、状态双编码 ✗（F5）、compose 页头 ✗（F11）、gate 文案 ✗（F1） |
| §15.4 页面 | `?page=pages` | ✅ 存在 | 行内 primary 标记 ✗（F2 同形） |
| §15.4 媒体 | `?page=media` | 🟡 只读索引 | 上传/引用视图仍缺（checklist 已记 🟡） |
| §15.4 分类与标签 | `?page=categories` + **`?page=tags`（本轮新增）** | 🟡→（待上线） | `tags` 未上线 → 无法判定；源码级发现 F7/F12/F13 |
| §15.5 外观 / Hero / SEO / 分发 | `?page=appearance|heroes|seo|feeds` | ✅ 存在 | appearance 重复 h2 ✗（F4） |
| §15.6 节点身份 / Hub | `?page=operations|hub` | 🟡 申请流缺（checklist） | hub 空态+状态 ✗ |
| §15.7 经济 | `?page=policy|access` | 🟡 账户/Adapter 界面缺 | 状态双编码 ✗ |
| §15.8 Agent | `?page=agents` | 🟡 工具清单界面缺 | 空态 ✓（有引导） |
| §15.9 设置 | 外观并入 `?page=appearance` | 🟡 通用设置缺 | — |
| spec §15.2 未落地菜单项 | `factory`（节点 NFT）已在菜单、spec §15.2 树里没有 | 漂移 | 提案 D2 |

---

## E. 走查使用到的可复现断言（供 QA 复核）

```js
// 1) 可见 primary 数量（§4.3）
[...document.querySelectorAll('button,a')]
  .filter(el => el.getBoundingClientRect().width > 0 && el.getAttribute('data-variant') === 'primary').length

// 2) 无双滚动条（§2.5）
document.documentElement.scrollHeight === document.documentElement.clientHeight

// 3) 当前行恰好 1 个（§23）
[...document.querySelectorAll('[data-active="true"]')].map(el => el.textContent.trim())

// 4) 内容区链接全部有 target（§2.6，改写后的口径）
[...document.querySelectorAll('*')]
  .filter(el => el.scrollHeight > el.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(el).overflowY))
  .pop().querySelectorAll('a:not([target])').length

// 5) 运行期英文空文案（§20 / §4.4）
[...document.querySelectorAll('*')].filter(el => el.children.length === 0 && /No items to display/i.test(el.textContent)).length

// 6) gate 卡密度（§3.3）
getComputedStyle(document.querySelector('[data-aup-id$="-view-1-view-1"]')).padding

// 7) U1（Hero）：Tab 到圆点后
({ box: document.activeElement.getBoundingClientRect(), outline: getComputedStyle(document.activeElement).outline })
```
