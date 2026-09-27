# UI-001: 控制台令牌/组件一致性收口 + Hero 轮播控件可访问性

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-001 |
| 状态 | 待 PM 派活（U1 已由 UI 实现并自测） |
| 提出轮次 | round-6 |
| 上游依据 | spec §15.1–§15.10（后台信息架构与功能目标）· spec §17–§18 / §104–§106（Web Device / Theme）· [`docs/ArcBlog-admin-ui-design.md`](../ArcBlog-admin-ui-design.md) §2.4 / §3.3 / §4.1 / §4.3 / §4.4 / §5.1 / §5.3 / §9 · [`docs/arc-contracts.md`](../arc-contracts.md) §14 / §17 / §19 / §20 / §23–§25 · PM 的 REQ-001（标签管理界面） |
| 实现方 | **UI 自改**：U1（`.web/components/hero-carousel/style.css`）· **需 Dev**：F1–F13（`.aup/**`、`scripts/console-nav.mjs`）· **升级 Lead**：D1–D4（设计标准/spec/CLAUDE.md 与实现漂移）、Q1（主题闪烁取舍） |

> **证据快照**：2026-09-27 19:0x，`git HEAD = b751d9f`；工作区含 Dev 本轮在飞改动（`?? .aup/pages/site/tags.aup`、`M scripts/console-nav.mjs` 等，菜单已加入 `tags` = **17 页**，但 `?page=tags` 尚未 generate/build/restart，运行期仍回落首页）。
> 静态证据：仓库源码（行号见各条）。运行期证据：共享调试 Chrome（`:9333`，admin 会话 `Testadmin`）+ CDP `Target.createBrowserContext` 造的**无 cookie guest 上下文**；视口 1803×908（控制台）/ 1440×900（Hero 截图）。

---

## 1. 问题

现象 + 证据（每条都可复现）。按「违反的标准 → 现象 → 证据」排列。

### F1（需 Dev）`?page=posts` 游客登录卡写着「运维 / Operations」

- 现象：未登录访客打开帖子页，登录卡的标题是 **Operations / 运维**、说明是「查看节点健康、Hub、经济与 Agent 状态」——这是运维页的文案，与「内容 / 帖子」无关。17 个控制台页里只有这一页的 gate 文案串了页。
- 证据：`.aup/pages/admin/posts.aup:29-30`（`gate-desc` / `gate-title`）；guest 上下文实测 `?page=posts` 的可见 `h2` = `["运维"]`，而 `?page=pages` = `["页面"]`、`?page=dashboard` = `["仪表盘"]`、`?page=compose` = `["用钱包发布"]`。
- 依据：admin-ui-design §9「页头：标题 + 一句话说明」、§1「诚实」。
- 影响：访客以为点错页面，第一屏就失去信任。

### F2（需 Dev）`?page=posts` 一屏 30 个 `primary` 按钮

- 现象：页头 1 个「New post」主按钮 + **草稿列表每一行 1 个「Publish」主按钮**；当前实例有 29 条草稿 → 同屏 30 个高亮主按钮。标准是「Primary 每个页面最多 1 个 / 每屏一个」。
- 证据：实测表达式
  `[...document.querySelectorAll('button,a')].filter(el=>el.getBoundingClientRect().width>0 && el.getAttribute('data-variant')==='primary').length` → `30`，标签集合 = `{New post, Publish}`；源码 `.aup/pages/admin/posts.aup:124`（页头 primary）与 `:167`（行内 `variant=primary size=sm label=:admin-publish`）。`?page=pages` 同形（`:124` create-offline 与 `:152` 行内 publish，只是因为当前 online 列表为空才只显示 1 个）。
- 依据：admin-ui-design §4.3「Primary 每页最多 1 个」、§2.4「主操作只有一个」、§9。
- 影响：主操作失去唯一性；行内「Publish」是**写操作**，30 个同样的红色/高亮按钮并排，误点成本高。

### F3（需 Dev）空列表在运行期显示英文 `No items to display`，把本地化引导挤到后面

- 现象：列表型空态的实际文案是运行期默认英文；`.aup` 里写的 `emptyText=:key`（含 en/zh）不被求值——这是已记录的平台缺口。`pages` / `agents` / `media` 靠列表**后面**的 dim 说明兜底；`dashboard` 的三条列表没有兜底。
- 证据：`arc-contracts.md` §20（实测：`emptyText=:list-empty` 编译为 `"$t(page.list-empty)"`，运行期不求值）；浏览器实测 `?page=dashboard|pages|media|agents` 各命中 **1 处** 叶子节点文本含 `No items to display`（英文）；`.aup/pages/ops/agents.aup:114-116`、`.aup/pages/ops/media.aup:107`、`.aup/pages/admin/pages.aup:146,160` 有兜底说明；`.aup/pages/admin/dashboard.aup:132,148,158` 三个 `afs-list` 只有 `emptyText`，无兜底。
- 依据：admin-ui-design §4.4「空状态是引导页，不是『暂无数据』四个字」、§8 表格最后一行（列表空态用列表后的常驻 dim 说明承载）、§9「状态」。
- 影响：中文站点里出现英文运行期文案；`dashboard` 的「Agent grants」空卡只有一句英文，运营者不知道下一步做什么。

### F4（需 Dev）`?page=appearance` 同屏两个可见 `h2`，文案都是「Appearance」

- 现象：页面自己的标题 + 运行时 `auto-surface` 自带标题同时渲染。
- 证据：`.aup/pages/admin/appearance.aup:89`（`h2 :title`）与 `:91`（`auto-surface "Appearance" from "/instance/settings/arcblog"`）；实测可见 `h2` = `["Appearance","Appearance"]`，DOM id 分别为 `appearance-view-1-view-1-row-2-view-2-h2-1` 与 `appearance-view-1-view-1-row-2-view-2-auto-surface-3-title`；该页 `auto-surface` 之外的 token 卡数量 = 0（内容区完全交给运行时组件，故其内边距/标题都不受控制台 token 管辖）。
- 依据：admin-ui-design §3.4「`h2` 页面标题，每页一个」、§9「页头」。
- 影响：读起来像重复的页面标题，且这一页的内容区看起来和其余 16 页不是同一个产品。

### F5（需 Dev）行内状态是英文枚举裸文本，没有色点双编码、没有 i18n

- 现象：列表行直接打印记录字段，用户看到 `published` / `archived` / `deleted` / `failed` / `pending` / `done`。
- 证据：`.aup/pages/admin/posts.aup:145,161`（`p "${entry.content.status}" scale=sm intent=muted`）；`?page=posts` 实测 `document.body.innerText` 含裸 `published`/`archived`/`deleted`；`?page=hub` 含 `failed`；`?page=access` 含 `paid`；本轮新增的 `.aup/pages/site/tags.aup:176,178`（`p "${entry.content.action}" scale=lg` / `p "${entry.content.status}"`）同样如此。
- 依据：admin-ui-design §4.1「状态点与文字必须同时出现（双编码）」、§7「所有文案走 i18n key」、§9「双编码」「i18n」。
- 影响：色盲用户没有第二编码；中英混排；`tags` 页的 `noop`/`done` 对非开发者不可读（该页已有 `queue-legend` 文字解释，属部分补偿）。

### F6（需 Dev）游客 gate 卡 `padding: 20px`，与「控制台统一 14px」冲突（17/17 页）

- 现象：控制台内容卡已统一 `padding: 14px`（实测 dashboard 6 卡 / posts 3 卡：pad `14px`、gap `10px`、radius `10px`、shadow `none`），但每页的 gate 卡仍是 20px；访客看到的控制台与登录后看到的不是同一套密度。
- 证据：实测 `?page=posts` guest gate 卡（`data-aup-id=posts-view-1-view-1-view-1`）computed `padding: 20px`、`gap: 10px`、`radius: 10px`、`boxShadow: none`；`grep` 统计 17 个控制台页**每页恰好 1 处** `padding: "20px"` 挂在 `var(--card-bg)` 卡上（gate 卡）；`arc-contracts.md` §21.6 / admin-ui-design §3.3「控制台精修取值：卡片 padding 14px + gap=sm」。
- 另一处同类偏差：`compose` / `compose-edit` 的内容卡用 `padding: "var(--space-block, 16px)"`（运行期 = 20px）+ `gap=md`(20px)。实测 `?page=compose`：5 张卡 pad 全为 `20px`、gap 全为 `20px`（`appearance` 的 token 卡 0 张，见 F4）。绑定页 `compose-edit` 的 gate 卡也用 `var(--space-block, 16px)`，是 18 个控制台页面源文件里唯一不用 `20px` 的 gate。
- 依据：admin-ui-design §3.3、§21.6、§9「Token」。
- 影响：视觉密度在「未登录 / 已登录」「写文章 / 其余页」之间跳变——正是 §3.3 记为「粗旷感来源」的 20px。

### F7（需 Dev）新增标签页的网格与间距偏离已固化的网格配方

- 现象：`.aup/pages/site/tags.aup` 首次在控制台用 `grid`，配方是 `minmax(380px, 1fr)` + `gap=md`(20px)；标准配方是 `minmax(520px, 1fr)` + `gap: "14px"`。
- 证据：`.aup/pages/site/tags.aup:157`；admin-ui-design §2.2（卡片型网格配方与「`gap: 14px`」）、§21.5（`gap=md` = 20px = 默认值，「写它等于没改」；`gap=md` 属 `block` 刻度，§3.3 明确「控制台不用」）。**同仓库的正确先例**：`.aup/pages/site/heroes.aup:118` 用的正是 `gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))"` + `gap: "14px"`。
- 影响：本轮新增的管理界面与既有 16 页不同密度；380px 下限在 1200px 视口会切成 2–3 列，卡片内文字换行更碎。
- 说明：该页其余写法**符合**标准（见 §4「做对的部分」），本条只要求对齐配方。

### F8（需 Dev）DID / 哈希：无中间截断、无「复制」

- 现象：控制台内**没有任何复制入口**（实测 `button/a` 文本或 `title` 命中 `copy|复制` 的数量 = 0）；节点标识以等宽全量渲染。
- 证据：`?page=dashboard` 实测叶子节点中 `font-family` 含 mono 的文本 `a2c75366a73f465b`（源码 `.aup/pages/admin/dashboard.aup:113` `p "${state.nodeProfile.did}" scale=sm intent=muted style={fontFamily: monospace}`）；`?page=factory` 同类字段当前实例未渲染出可识别的地址/哈希文本（`0x…`/长 base58 命中 0）。
- 依据：admin-ui-design §5.1「永远中间截断（保留头尾），配一键复制；完整值悬停可见」、§9「数据」。
- 影响：运营者要把节点 DID 贴进 Hub 注册/CLI 时只能手抄。
- 备注：控制台没有剪贴板原语（`arc-contracts.md` §25.1 的已实现原语清单里没有复制类原语）。可选路径：① 自定义 Web Device 组件（`.web/components/**`）+ `frame` 嵌入；② 用 `key-value-list` + `title` 承载完整值，截断只做视觉。**两条都需 Dev 先验证 `frame` 在控制台页内的尺寸/性能代价**，UI 不预设实现。

### F9（需 Dev）侧栏没有「品牌 / 关于 / RSS / 版权」页脚

- 现象：控制台确实**不渲染站点页脚**（符合 §2.1 前半句），但标准要求的后半句——把品牌/关于/RSS/版权收进侧栏底部（`marginTop: auto`）——没有实现；侧栏最后一行就是 `Factory`。
- 证据：实测控制台页 `document.querySelector('.aup-app-footer, footer')` = `null`；侧栏（`overflowY:auto`、宽 270px = `clamp(200px,15vw,280px)`）内按钮 16 行，最后 5 行 = `Media, Agents, Policy, Access, Factory`，无品牌行；生成器 `scripts/console-nav.mjs:95-156`（`sidebarLines()` 只产分组 + 菜单项 + 分隔线）。
- 依据：admin-ui-design §2.1「侧栏页脚」行、§9 骨架。
- 影响：站点级入口（关于/RSS）在控制台里消失；该页脚也是本项目 `hero`/`theme` 之外唯一的品牌落点。

### F10（需 Dev）时间呈现不统一：只有 3 页用相对时间

- 现象：`time mode=display timeMode=relative` 只在 `dashboard` / `operations` / `agents` 出现；`posts` / `pages` / `media` / `hub` / `factory` 的列表行没有时间，`tags` 页有（`tags.aup:128`）。
- 证据：`grep -rn "time mode=display" .aup/pages/` → `dashboard.aup:136`、`operations.aup:111,118,132`、`agents.aup:105`、`tags.aup:128`；实测 `?page=dashboard` 渲染出 `9 days ago` / `9 hours ago` / `1 hour ago`（相对时间可用）；其余控制台页无相对时间文本。
- 依据：admin-ui-design §5.3「默认相对时间，悬停/详情显示绝对时间」、§9「数据」。
- 影响：同一列表里「有时间的页」和「没时间的页」判断新鲜度的方式不同。

### F11（需 Dev）`?page=compose` 没有页头（0 个可见 `h2`）

- 现象：写文章页直接从「Pre-publish checks」卡开始，没有页面标题 + 一句话说明。
- 证据：`.aup/pages/admin/compose.aup` 的 i18n 里没有 `title` / `desc` 键（首屏只有 `h3 :checks` 等段标题，源码 `:108,112,123,139`）；实测 `?page=compose` 可见 `h2` = `[]`（guest 与 admin 均然）。
- 依据：admin-ui-design §2.4「每页自上而下三层，第一层是页头」、§9「页头」。
- 影响：与 `compose-edit`（有 `h2 :title`）及另外 15 页不一致；深链进入时没有任何「这是哪一页」的锚点。

### F12（需 Dev）标签页的「源标签」是自由文本输入，易打错

- 现象：重命名/合并表单的 `Tag` 字段是 `input type=text`，用户必须凭记忆精确输入一个已有标签；输入不存在的标签在 worker 侧是 `noop`。
- 证据：`.aup/pages/site/tags.aup:161-162`（`input type=text label=:f-from name=tagFrom required=true`）；投影记录已带全部标签（`scripts/arcblog-tags.mjs` 的 `items/` 里 `tag` + `count`）。
- 依据：spec §15.4（标签「使用计数、合并重命名、清理零引用标签」）、admin-ui-design §4.5「失败提示三要素」。
- 建议：把源字段换成已实现的 `searchable-dropdown` 原语（`arc-contracts.md` §25.1 列为已实现），选项来自 `/instance/app/arcblog/tags/items`；目标字段保持自由文本（重命名需要一个新名字）。
- 备注：这是**体验建议**，不是标准违反；REQ-001 的验收标准若未覆盖，可由 PM 决定是否纳入。

### F13（需 Dev）标签页队列行用 `scale=lg` 显示动作名

- 现象：`p "${entry.content.action}" scale=lg` —— `lg` 在本仓库只出现 6 次，控制台正文层级用的是默认档 / `sm` / `caption`；动作名（`merge`/`refresh`）不是页面主标题，放大反而抢注意力。
- 证据：`.aup/pages/site/tags.aup:176`；`grep -rho "scale=[a-z]*" .aup/pages/` → `caption 81 / sm 119 / display 3 / lg 6`。
- 依据：admin-ui-design §3.4 排版层级（卡片内标题 = `--type-body`）、§1「克制」。
- 建议：动作名降到默认档或 `sm`，与同行的 `status` / `message` 形成层级，把强调留给状态色点（配合 F5）。

### U1（UI 自改，已实现）Hero 轮播控件：圆点命中区 9×9、键盘焦点不可见

- 现象（修改前实测）：首页 Hero 的幻灯片圆点是 **9×9 CSS px** 的按钮（`getBoundingClientRect()`），远低于 WCAG 2.5.8 的 24×24 最低命中区；圆点被引擎写了 `outline:none`，`:focus-visible` 命中时 computed `outline-style: none`、`box-shadow: none` → **键盘用户看不到焦点落在哪**（WCAG 2.4.7）。左右箭头的焦点环只有浏览器默认 `auto 1px rgb(0,95,204)`，在深色遮罩上几乎不可见。
- 证据（修改前）：`getBoundingClientRect()` = 9×9；`document.activeElement.matches(':focus-visible') === true` 且 `outline: none`；`document.styleSheets` 里 `.ps-nav__dot { outline: none }` 来自引擎注入的 `#ps-css`（`.web/components/hero-carousel/vendor/photo-story.js:151`），组件样式表未补；修复前后截图见 §5 验收表 A1–A4。
- 依据：spec §17（公共站 Web Device）；WCAG 2.5.8（Target Size Minimum AA）、2.4.7（Focus Visible AA）；`docs/ArcBlog-admin-ui-design.md` §7 的响应式/弹性精神（该文档不约束公共站，此处作为同源设计原则引用）。
- 影响：触屏用户点不中圆点、键盘用户无法确认焦点位置——Hero 是首页唯一的策展位。

---

## 2. 目标用户场景

1. **站点运营者（admin），日常巡检**：打开 `?page=posts` 想「写一篇 / 处理草稿」；当前一屏 30 个高亮主按钮（F2），他无法判断「这一页的主操作」是哪一个，而行内 Publish 是写操作。他要的是：页头唯一主操作 = 写新文章，行内发布是次级动作。
2. **未登录访客，被分享链接带到内容页**：打开 `/?page=posts` 看到「运维」（F1），当前无法判断这个站点能做什么，也不知道登录后会发生什么。
3. **只用键盘/触屏的读者，在首页 Hero 上**：想手动切到下一张幻灯片；当前 Tab 到圆点时屏幕没有任何变化（U1 修改前），手指也点不中 9px 的目标。
4. **中文站点的运营者，遇到空列表**：`?page=dashboard` 的 Agent 授权为空时看到 `No items to display`（英文、无下一步，F3），要确认是「功能没做」还是「就是没有数据」。
5. **Hub 运营者 / Studio 运营者，复制节点标识**：要把 DID/地址贴进 CLI 或 Hub 注册表单（F8），当前只能靠肉眼抄写——这类字符串正是最不该手抄的。

---

## 3. 方案

### 3.1 总原则

- **不改业务逻辑、不动绑定与权限**：F1–F13 全部是标记/文案/密度层面的改动；凡是会改变数据、绑定或 AFS 交互的（例如 F8 的复制组件可能引入 `frame`）都单独标注「需先实测」。
- **只在既有 token 内取值**：间距走 §3.3 刻度（14px / 10px / 8px），颜色只用 `var(--color-*)` / `var(--card-*)` / `var(--radius-*)`，不新增裸色值。
- **公共站与后台两套标准不互相污染**：U1 只改 `.web/components/hero-carousel/style.css`（公共站 Web Device），不触碰后台 token。

### 3.2 逐条落地

| # | 方案（具体到文件与结构） | 实现方 |
| - | ---------------------- | ------ |
| F1 | 改 `.aup/pages/admin/posts.aup` 的 `gate-title` → `Studio / 创作者工作室`（或直接复用该页 `studio`/`studio-desc` 的语义），`gate-desc` → 一句「登录后可管理草稿与已发布文章」；顺带核对其余 16 页 gate 文案是否自指（`?page=agents|media` 现在也显示「运维」，属**可接受**的组级兜底，但要在页面上至少能看出是运维组） | 需 Dev |
| F2 | `.aup/pages/admin/posts.aup:167`（草稿行 Publish）与 `.aup/pages/admin/pages.aup:152`（离线行 Publish）由 `variant=primary` 改 `variant=secondary`（`pages.aup:124` 的 create-offline 是否降级由 PM 定：若它是页头主操作则保留 primary）；页头主操作保持唯一 `primary` | 需 Dev |
| F3 | 三条路径：① `dashboard.aup:132,148,158` 三条列表后各加 1 行 `p … intent=muted scale=sm` 引导（与 `pages`/`agents`/`media` 现有写法一致）；② 全站统一列表空态文案落点，**不再依赖 `emptyText`**；③ 可选实测：`emptyText` 传空白/不可见字符能否抑制运行期英文默认值——**必须实测后再合并**，不要在未验证时替换 17 处 | 需 Dev |
| F4 | `.aup/pages/admin/appearance.aup:89` 与 `:91` 二者留一：推荐保留页面自己的 `h2 :title` + `p :desc`，给 `auto-surface` 传一个不渲染标题的形态（若原语不支持，则删掉页面自己的 `h2`，让 auto-surface 标题成为唯一 `h2`，并补 `p :desc`） | 需 Dev |
| F5 | 状态改「色点 + 本地化文字」：在所属页 `i18n {}` 声明 `status-published/draft/archived/deleted/…`（页面作用域 key），行内渲染 `<span>●</span> + $t`；色点用语义色 token。`tags` 页动作名同样本地化（见 F13） | 需 Dev |
| F6 | 17 页 gate 卡 `padding: "20px"` → `"14px"`（或统一为 `var(--card-padding, 14px)` 之类的单一来源，若 Dev 倾向加变量需在此提案里注明来源）；`compose` / `compose-edit` 的 12 张卡 `var(--space-block, 16px)` + `gap=md` → `padding: "14px"` + `gap=sm`（与 dashboard/posts 实测值对齐） | 需 Dev |
| F7 | `.aup/pages/site/tags.aup:157`：`minmax(380px,1fr)` → `minmax(520px,1fr)`、`gap=md` → `style={gap: "14px"}`；其余不动 | 需 Dev |
| F8 | 两步走：①（低风险）先把长标识做**中间截断**并 `title` 完整值（纯标记改动）；②（需实测）再评估复制入口：控制台内没有剪贴板原语，候选是 `.web/components/copy-field/` 自定义组件 + `frame` 嵌入（`arc-contracts.md` §14 记录 frame 没有 `style`、默认 200px 高，必须 `aspectRatio`/固定尺寸并实测）；UI 可在 Dev 确认路线后负责组件本体 | 需 Dev（①）／UI+Dev（②） |
| F9 | `scripts/console-nav.mjs` 的 `sidebarLines()` 末尾追加固定行（品牌/关于/RSS/版权），用 `marginTop:auto` 顶到底；注意：① 生成器写进 17 个页面 → 必须 `node scripts/arcblog-console-nav.mjs` + `arc dsl generate --write`；② 新行也要 `$t(wrapper.*)` + `wrapper.aup` 声明；③ `--check` 门禁必须仍绿 | 需 Dev |
| F10 | 给缺时间的列表行补 `time mode=display value="${entry.content.updatedAt 或 publishedAt}" timeMode=relative`（字段以记录实际字段为准，避免渲染空值） | 需 Dev |
| F11 | `compose.aup` 内容区顶部补 `h2 :title` + `p :desc`（沿用 `compose-edit` 的标题档 `fontSize: "var(--type-subheading)"`），并在 i18n 块声明两键 | 需 Dev |
| F12 | `.aup/pages/site/tags.aup:161` 的 `input` → `searchable-dropdown`（选项来自 `tags/items` 投影）；若原语在控制台页不可用，退化为 `input` + `p :f-hint` 已列出的「现有标签见右侧列表」并保持现状 | 需 Dev（先实测） |
| F13 | `.aup/pages/site/tags.aup:176` 的 `scale=lg` → 默认档或 `sm` | 需 Dev |
| U1 | `.web/components/hero-carousel/style.css`：圆点按钮 24×24 + 7px `::after` 视觉 mark（负外边距 + `.ps-nav` 底边 −7.5px 补偿，视觉基准不动）；`.ps-nav__dot:focus-visible` / `.ps-nav__arrow:focus-visible` 补 `outline: 2px solid #fff; outline-offset: 3px`；选择器提到 `.hero-carousel.photo-story`（0,3,0）以压过引擎的 `.photo-story--dark .ps-nav__dot`（0,2,0） | **UI 已实现** |

### 3.3 做对的部分（不要在本轮改掉）

- **16 个已上线页面骨架完全一致**（菜单 17 页，`tags` 尚未 generate/build/restart）：侧栏 `clamp(200px,15vw,280px)`（实测 270px @1803）、顶栏 `100vw` 全出血（实测 1803 @x=0, h=48）、当前行**恰好 1 个** `data-active="true"` + `aria-current="page"`；页面标题 `h2` 每页 1 个（例外：`compose` 0 个、`appearance` 2 个 → F4/F11）。
- **无双滚动条**：实测每页 `documentElement.scrollHeight === clientHeight`（908/908），需要滚动的页只有一个 `overflowY:auto` 容器（posts 749/2749、heroes 714/1192、factory 860/1405、compose 908/1818）。
- **点击去向合规**：`?page=posts` 主内容区 61 个可见 `a` **全部有 `target`**；全站唯一无 `target` 的 `a` 是 wrapper 的 `site-header` 品牌链接（`href="/"`，属框架 chrome，不在内容区）。§2.6 的口径在**内容区**成立。
- **控制台不渲染站点页脚**（实测 `.aup-app-footer` 不存在）；卡片的 `boxShadow: none` / `radius: 10px` 已统一。
- **标签页做得对的地方**（本轮新增，值得保留）：空态卡是标准 §4.4 的「一句现状 + 一句价值 + 一个动作」（`tags.aup:150-155`，动作 `-> page compose`）；表单 `input` 用 `state={value: ""}`（静态初值，符合 `arc-contracts.md` §19）；两个 `primary`（空态的「写文章」与表单的「提交」）由 `visible="${state.snapshot.count}"` / `visible="!${state.snapshot.count}"` 互斥，**同屏只有一个 primary**；重命名/合并只入队、由 worker 执行，并在界面上写清（`worker-note`）——符合 §1「诚实」。
- **Hero 主题跟随**：`.web/components/hero-carousel/init.js` 的 `syncHostTheme()` + `prefers-reduced-motion` 降级都正确（实测 embedded 页 `<html>` 与宿主一致）。

### 3.4 与现有标准的差异 / 需要改标准的部分（升级 Lead）

- **D1 `docs/ArcBlog-admin-ui-design.md` 已与实现漂移**（该文件不在 UI 写范围，需 Lead 裁定由谁改）：
  - §2.3 整节描述「一个 AUP 页面 + 15 个节 + hash 深链 + console-bridge」——**B′ 已废弃**（现状：一事一页 `?page=<name>`，`arc-contracts.md` §23）。
  - §2.5 写「菜单为四组十三项」——现状 **4 组 17 项**（本轮加 `tags`）。
  - §2.1 表格写「侧边栏宽度 200px」与下一行「`clamp(200px, 15vw, 280px)`」自相矛盾；实测取后者（270px @1803）。
  - §8 表格写 `console-shell height: calc(100vh - 130px)`——现状 `calc(100vh - 48px)` + `marginBottom: -52px`（`arc-contracts.md` §21.4）；`130px` 是「含页脚」时代的常数。
  - §9 验收口径 `[...document.querySelectorAll('[data-aup-id="console-pane"] a')].filter(a=>!a.target)` **不可执行**：生成器已改为 id-less 标记（§25.3），DOM 里没有 `console-pane` 这个 `data-aup-id`。建议改为「主内容滚动区内可见 `a` 全部有 `target`」。
- **D2 `spec §15.1/§15.2` 同样停留在 hash 版控制台**（§15.1 的「实现落点」段、§15.2 菜单树把「分类与标签」放在「内容」组、且没有 `factory`）；spec 是唯一权威，需要 Lead 决定「改 spec」还是「改实现」（本轮 Dev 把 `tags` 放在**站点**组、与 `categories` 相邻，与该组现状一致）。
- **D3 页面数量口径**：`CLAUDE.md`（"the 15 sections"）、`docs/team/roles/ui.md`、task-2 描述都写 15；实现在本提案开始时为 **16**、Dev 加入 `tags` 后为 **17**。建议把口径改成「以 `scripts/console-nav.mjs` 的 `CONSOLE_SECTIONS.length` 为准」，不再写死数字。
- **D4 「控制台统一 14px」的口径**：§3.3/§21.6 把 14px 记为控制台统一值，但 17 页 gate 卡与 compose 的 12 张卡是 20px；若认为 gate 卡（访客态）刻意用 20px，应在标准里**显式写出来**，否则 F6 会一直是「不符合」。
- **Q1（取舍，需 Lead 决策）主题闪烁**：站点默认 `theme=system`、编译 `mode light`（`.aup/app.aup:5`），`scripts/arcblog-theme.test.mjs` 只在 seed 固定时要求二者一致。本机实测 `prefers-color-scheme: light = true`、`data-mode` 稳定为 `light` → **本机无闪**；但按 `arc-contracts.md` §17 的表格，深色偏好访客每次导航会闪 ~300ms 浅色。选项 A（保持现状，记录为已知边界）／选项 B（站点默认外观固定为 `light` 并保持 `mode light`，牺牲 `system` 自适应）／选项 C（默认 `dark` + `mode dark`，反向）。**UI 建议 A**：闪烁只影响与编译值相反的少数访客，且 B/C 会牺牲 `system`；若 Lead 选 B/C，需要同时改 `seed/settings/arcblog/theme.json` 与 `.aup/app.aup`（两者都不在 UI 写范围）。

---

## 4. 涉及文件与写范围

| 路径 | 改动内容 | 实现方 |
| ---- | -------- | ------ |
| `.web/components/hero-carousel/style.css` | U1：圆点命中区 24×24 + `::after` 7px mark + 两控件 `:focus-visible` 焦点环 + `.ps-nav` 底边补偿 | **UI 自改（已完成）** |
| `docs/team/design/UI-001-console-tokens-and-walkthrough.md` | 本提案 | UI |
| `docs/team/design/review-console.md` | §9 逐项走查记录 | UI |
| `docs/team/design/screenshots/UI-001-hero-dot-focus-*.png` | U1 修复前/后证据（4 张） | UI |
| `.aup/pages/admin/posts.aup` | F1 gate 文案、F2 行内 primary → secondary、F5 状态双编码、F10 时间 | **Dev** |
| `.aup/pages/admin/pages.aup` | F2 行内 primary、F5/F10 | **Dev** |
| `.aup/pages/admin/compose.aup` | F6 卡片 14px/gap=sm、F11 页头 | **Dev** |
| `.aup/pages/admin/compose-edit.aup` | F6 卡片 14px | **Dev** |
| `.aup/pages/admin/appearance.aup` | F4 重复 h2、F6 gate 卡 | **Dev** |
| `.aup/pages/admin/dashboard.aup` | F3 空态引导、F8 标识截断、F10 时间 | **Dev** |
| `.aup/pages/site/*.aup`、`.aup/pages/ops/*.aup`、`.aup/pages/economy/*.aup` | F3/F5/F6/F10 的同形改动 | **Dev** |
| `.aup/pages/site/tags.aup` | F6 gate 卡、F7 网格配方、F12 源标签选择器、F13 `scale=lg` | **Dev** |
| `scripts/console-nav.mjs` + `node scripts/arcblog-console-nav.mjs` | F9 侧栏页脚 | **Dev** |
| `.aup/wrapper.aup` + `.aup/locales/*.json` | F9 新 `wrapper.*` 键（locales 由 `arc dsl generate --write` 生成，不手改） | **Dev** |
| `docs/ArcBlog-admin-ui-design.md`、`docs/ArcBlog-product-technical-spec.md`、`CLAUDE.md` | D1–D4 标准/口径漂移 | **Lead 裁定**（都不在 UI 写范围） |
| `seed/settings/arcblog/theme.json` + `.aup/app.aup` | Q1（仅在 Lead 选 B/C 时） | **Lead 裁定 → Dev** |

---

## 5. 验收方式

每条都能被别人独立复现。控制台断言在 **admin 会话**（共享调试 Chrome `:9333`）里跑 `http://arcblog.localhost:4939/?page=<name>`；访客断言用无 cookie 上下文（CDP `Target.createBrowserContext`，或隐身窗口）。

| # | 验收方式（可观察行为 / 截图路径 / 可复制命令） |
| - | --------------------------------------------- |
| A1（U1） | Hero 页 Tab 到圆点：`document.activeElement.matches(':focus-visible') === true` 且 `getComputedStyle(document.activeElement).outline === "rgb(255, 255, 255) solid 2px"`（修复前为 `none`）；`getBoundingClientRect()` = 24×24（修复前 9×9） |
| A2（U1） | 截图：`docs/team/design/screenshots/UI-001-hero-dot-focus-before-zoom.png`（无焦点环）↔ `UI-001-hero-dot-focus-after-zoom.png`（白色 2px 焦点环） |
| A3（U1） | 视觉基准不回退：圆点按钮中心 `(1405.5, 865.5)` @1440×900（修复前 `(1406.5, 866.5)`，偏差 ≤1px）；mark 仍为 7px |
| A4（U1） | `arc dsl validate --json` → `issues: []`；`npm test` → 28/28；`npm run test:file -- scripts/arcblog-hero-carousel.test.mjs` → 4/4；`node scripts/arcblog-hero-carousel.mjs --check` → `ok: true` |
| A5（F1） | 访客打开 `/?page=posts`：可见 `h2` 不含「运维/Operations」，而是内容页语义（如 `Studio`/`创作者工作室`） |
| A6（F2） | `?page=posts` 在 admin 会话下：`[...document.querySelectorAll('button,a')].filter(el=>el.getBoundingClientRect().width>0 && el.getAttribute('data-variant')==='primary').length === 1`（当前为 30） |
| A7（F3） | `?page=dashboard` 在 Agent 授权为空时：英文 `No items to display` 之后**紧跟**一条本地化 dim 引导（或该英文文案消失）；`pages`/`agents`/`media` 同理 |
| A8（F4） | `?page=appearance`：可见 `h2` 数量 = 1 |
| A9（F5） | `?page=posts`：`document.body.innerText` 不再出现裸 `published`/`archived`/`deleted`；行内有「色点 + 本地化状态」两个元素 |
| A10（F6） | `?page=posts` 访客态 gate 卡 computed `padding === "14px"`；`?page=compose` 全部卡 `padding === "14px"` 且 `rowGap === "10px"` |
| A11（F7） | `?page=tags`：grid 容器 computed `grid-template-columns` 含 `520px`，`gap === "14px"` |
| A12（F8） | 节点标识渲染为 `did:…` 中间截断 + 完整值 `title`（或复制入口），肉眼可见不再是一整串 |
| A13（F9） | 任一控制台页侧栏底部出现品牌/关于/RSS 行；`node scripts/arcblog-console-nav.mjs --check` 与 `npm test` 全绿 |
| A14（F10） | `?page=posts`（或其他列表页）每行出现相对时间文本（如 `3 days ago`/`3 天前`） |
| A15（F11） | `?page=compose` 可见 `h2` 数量 = 1 且紧跟一句 `desc` |
| A16（F12） | `?page=tags` 的源标签字段可从投影标签中选择（不是纯手输）；输入不存在的标签时给出明确提示 |
| A17（F13） | `?page=tags` 队列行动作名与同行 `status` 字号同档或更小（不再放大） |
| A18（通用门） | `arc dsl validate --json`（issues 为空）+ `npm test`（28/28）在改动后仍绿；改了 `.aup/**` 的提交必须附 `arc blocklet build` |
| A19（受限项，如实标注） | **标签页无法在本轮浏览器验证**：`?page=tags` 当前回落首页（`?page=tags` 实测渲染 `h2=Latest published`），需 Dev 先 `arc dsl generate --write` + `arc blocklet build` + 重启 daemon；验收前不得声称已端到端验证 |
| A20（受限项） | 控制台的**写入类**验收（行内 Publish/删除点击后落库）**未验证**：本轮只做只读测量，未点击任何写操作；这部分由 QA 按 REQ/任务口径验证 |

---

## 6. 验证命令（UI 已实现部分）

```bash
# U1 的实现只改 .web/components/hero-carousel/style.css（非生成物；script.js 才是生成物）
arc dsl validate --json                              # → issues: []
npm test                                             # → 28 pass / 0 fail
npm run test:file -- scripts/arcblog-hero-carousel.test.mjs   # → 4 pass / 0 fail
node scripts/arcblog-hero-carousel.mjs --check        # → ok: true, bytes: 34576

# 运行期复现（共享调试 Chrome :9333）
#   /p/en/hero-carousel/  → Tab 到 .ps-nav__dot → outline: rgb(255,255,255) solid 2px, box 24x24
#   截图：docs/team/design/screenshots/UI-001-hero-dot-focus-{before,after}[-zoom].png
```

**实际结果**（2026-09-27，HEAD `b751d9f` + Dev 在飞改动在场）：

- `arc dsl validate --json` → `issues: []`（`.web/components/hero-carousel/style.css` 在 validate 的输入清单里）
- `npm test` → `tests 28 / pass 28 / fail 0`，`fast tier passed`
- `npm run test:file -- scripts/arcblog-hero-carousel.test.mjs` → `tests 4 / pass 4 / fail 0`
- `node scripts/arcblog-hero-carousel.mjs --check` → `{"ok":true,"action":"check","bytes":34576}`（未触碰生成物）
- 运行期：修复前 Tab 到圆点 `outline: none`、box 9×9；修复后 `outline: rgb(255,255,255) solid 2px`、box 24×24、mark 7px、中心偏移 ≤1px

**未决问题**：D1–D4（标准/口径漂移，需 Lead 裁定改哪一边）、Q1（主题闪烁取舍）、F8 复制入口的实现路线（`frame` 在控制台内的尺寸/性能需 Dev 实测）、F12 `searchable-dropdown` 是否可在控制台页使用（需 Dev 实测）、F3 中「抑制运行期英文空文案」的具体手段需实测后再合并。
