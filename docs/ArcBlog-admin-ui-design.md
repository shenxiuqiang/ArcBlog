# ArcBlog 管理后台 UI 设计标准

> 让后台优雅的标准：不是更多装饰，而是更少意外。

**文档版本：** V1.1

**关联文档：**
[ArcBlog-product-technical-spec.md](ArcBlog-product-technical-spec.md) §14–§16（后台信息架构，权威来源）·
[ArcBlog-feature-checklist.md](ArcBlog-feature-checklist.md)（功能实现状态）·
[developer-guide.md](developer-guide.md)（AUP 落地约束）

**适用范围：** ArcBlog Admin（AUP 实现的全部控制台页面）。公共站点（Web Device）有自己的主题体系（§104–§106），不受本文档约束，但共享同一套设计哲学。

---

## 1. 设计哲学

优雅的后台来自四条原则，按优先级排序：

```text
1. 诚实   界面永远反映真实状态——能力没有就不显示，失败就说出具体原因
2. 克制   每页一个主操作；能不说的话不说；能不用的颜色不用
3. 一致   同样的信息用同样的方式呈现；同样的操作用同样的模式触发
4. 安静   不打断——不用弹窗炫耀成功，不用红点制造焦虑
```

对应产品文档 §15.1 的"全面、简单、实用、优雅"——本文档是"优雅"的可执行标准。

### 什么是不优雅（反模式清单）

```text
✗ 功能不可用但置灰显示（应该隐藏，§15.1）
✗ 操作成功后弹一个需要手动关闭的对话框
✗ 错误提示只说"操作失败"，不说为什么、怎么办
✗ 同一页面出现两个以上高亮主按钮
✗ 为了填满空间而展示的图表和数字
✗ 加载时白屏或布局跳动
✗ DID、哈希、金额挤在一起没有层次
```

---

## 2. 布局标准

### 2.1 控制台骨架

所有控制台页面共用同一个骨架（当前由 `scripts/console-nav.mjs` 生成侧边栏，任何页面不得自创布局）：

```text
┌──────────────────────────────────────────────┐ ▲
│  app-header（品牌 / 用户菜单）100vw 满宽        │ │
├──────────┬───────────────────────────────────┤ │
│          │  页头：标题 + 一句话说明 + 主操作   │ │ 视口
│ console- │───────────────────────────────────│ │ 高度
│ nav      │                                   │ │ 100%
│ 200px    │  console-scroll：唯一滚动区 ⇅ │ │
│          │                                   │ │
└──────────┴───────────────────────────────────┘ ▼
```

页面整体锁定视口高度，**只有右侧 `console-scroll` 内部滚动**——详见 §2.3。

| 项 | 标准 |
| -- | ---- |
| 顶栏 | 页面内 `view console-topbar`（`width: 100vw` + `margin-left: calc(50% - 50vw)`）承载 `app-header`，与控制台同宽贴边 |
| 侧边栏宽度 | `200px`，`flexShrink: 0` |
| 侧边栏样式 | **扁平、贴左边缘、与顶栏/视口底部零间距**：容器无边框无圆角无内边距（`padding: 0`、`gap: 0`），与右侧内容之间 1px 右分割线；**不渲染页脚**；菜单项无边框无圆角、左对齐满宽、左右内边距 `8px 20px`；项与项之间、分组之间各 1px 浅分割线 |
| 侧边栏宽度 | `clamp(200px, 15vw, 280px)` —— 窄屏保底 200px，宽屏随视口增长（1722px 视口实测 258px） |
| 选中菜单项 | 深色实心块（`background: var(--color-text)`，文字 `var(--color-bg)`），**与未选中项共用同一左对齐内边距**（实测两者文字左缩进均为 20px）；不使用 `variant=primary`（它会居中标签造成位移） |
| 分组名称（一级） | 独立背景带（`background: var(--color-bg)`）+ 文字左缩进 **20px**，与二级菜单形成层次 |
| 菜单项（二级） | 文字左缩进 **32px**（比一级多 12px 的层级缩进），满宽、左对齐 |
| 当前菜单项 | 深色实心块（内联 `background: var(--color-text)` + `color: var(--color-bg)`），与未选中项同一左对齐内边距；**不用** `variant=primary`（它居中标签） |
| 侧栏页脚 | 控制台不渲染站点页脚，品牌/关于/RSS/版权收进侧栏底部（`marginTop: auto`） |
| 内容区间距 | `gap` 使用间距刻度（§3.3），不用魔术数字 |

### 2.2 网格布局（右侧内容区）

宽屏下**不要把所有内容堆成一整行**：卡片型内容用网格自动分列，列表型内容保持整行。

```text
卡片型（概览 / 状态 / 表单 + 列表组合）
  style={display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))",
         gap: "14px", alignItems: "start"}
  → 1722px 视口实测 2 列（各 694px），1200px 视口退化为 1 列

列表型（文章列表、订单、索引等需要横向空间的行）
  保持整行，不塞进网格
```

规则：

* `alignItems: "start"` 必须显式设置，否则同一行的卡片会被拉伸到等高于最高卡片，留出大片空白。
* 网格只包裹**同质卡片**；若滚动区直接子元素里混有 `h2`/`h3` 标题或裸 `afs-list`，不做网格（标题会变成网格单元）——这类页面（admin、heroes-admin、categories-admin）保持整行。
* 目前启用网格：dashboard（概览卡 2×2）、operations（健康 + 发现）、pages-admin、hub-admin、policy-admin（策略 + 商品）；其余页面每项内容各成一块，保持整行。

### 2.3 控制台结构（单页 + hash 节）

控制台是**一个 AUP 页面**（`?page=console`），左侧是节导航，右侧是节内容；URL 用 hash 保持深链，交互对齐 `.well-known/service/user#profile`：

```
/?page=console#admin
┌──────────────────────────────────────────────────────────┐
│ 顶栏（app-header：品牌 / 主题 / 语言 / 用户菜单）            │
├──────────────┬───────────────────────────────────────────┤
│ 内容          │  你的工作室                                │
│  仪表盘       │  在一个与钱包绑定的工作区中管理…             │
│  工作室 ←     │  ┌─────────────────────────────────────┐  │
│  页面         │  │ 生命周期控制 / 你的内容 / 列表 …      │  │
│  写文章       │  └─────────────────────────────────────┘  │
│ 站点 / 运营 / 经济 …                                        │
└──────────────┴───────────────────────────────────────────┘
```

* **15 个节 = 15 个页签面板**（`view console-sections mode=tabs`）：内容、帖子、页面、写文章、Hero、分类、SEO、分发、外观、运维、Hub、媒体、Agent、分成策略、访问授权。
* **侧栏是导航、页签条隐藏**：侧栏项是 `action … href="#<section>"` 的 hash 链接；运行时生成的 tab 条由 console-bridge 用 CSS 隐藏，只当切换引擎用。
* **切换是就地替换**：实测点击侧栏/页签时侧栏、页签容器、15 个面板与其内列表的 DOM **全部复用**，零网络往返、零整页重渲染（arc-contracts §21.14 坑 1：`hashchange` 会导致子树重建，因此 URL 用 `pushState` 更新）。
* **深链**：`?page=console#media-admin` 可直接打开、可分享、刷新后恢复；默认 landing 规范化为 `#dashboard`。节切换用 `replaceState`，**不进入浏览器历史**（运行时自身的历史处理会与 `pushState` 打架，arc-contracts §21.14.1）——后退按普通页面离开控制台。
* **侧栏行必须铺满**：`action href` 渲染的 `<a>` 被运行时按行内布局（实测 258px 列里只有 91px），桥注入 `align-self:stretch` 才成为整行可点、整行高亮的菜单项。
* **切面板不要点运行时的页签按钮**：那会触发 `tab-change` 上报并导致侧栏/面板子树重写（闪动）；桥直接切换 `data-active`（同一 DOM 契约）。
* **悬停与选中必须同时定义**：悬停只改背景会把选中项变成"浅底 + 近白字"（不可读）。hover 规则要同时给文字色，并为选中态补 `:hover` 变体；两态对比度实测均 16.59:1（arc-contracts §21.14.1）。
* **旧链接不失效**：15 个旧页名（`?page=admin` 等）与绑定路由 `/manage/seo` 各保留一个**极简别名页**，由 console-bridge 用 `sessionStorage` 交接后跳到对应 `#<section>`。
* **右侧内容多时用节内页签**：节内可再放 `view mode=tabs`（桥只接管顶层 `console-sections`），用于"列表 + 详情"或多视图并列。

### 2.4 页面内部结构

每个页面自上而下只有三层，顺序固定：

```text
1. 页头      标题（h2）+ 一句话说明（dim 色）+ 右侧主操作（最多一个）
2. 状态条    可选：仅在有异常/待办时出现（如"3 个 Hub 同步失败"）
3. 内容区    卡片 / 列表 / 表单
```

* **标题不说废话**：标题是"订单"，说明是"谁付款、谁获益、按什么规则分配"——说明回答"这一页是干什么的"，不重复标题。
* **主操作只有一个**：「写新文章」「签发授权」「注册 Hub」。次要操作放进列表行内或次级按钮。
* **状态条可点击**：点击直达问题所在的过滤视图，不做弹窗。

### 2.5 全高流式布局与滚动归属

控制台页面是**应用，不是文档**：页面宽高 100% 流式铺满视口，页面本身固定不动，滚动只发生在它该发生的地方。

```text
宽度   100% 流式：console-pane flex: 1 随视口伸缩，无固定页宽，无横向滚动
高度   100% 锁定：console-shell 撑满视口剩余高度，页面不出现纵向滚动条
滚动   单一归属：只有右侧 console-pane 内部纵向滚动（overflow-y: auto）
```

规则：

* **页面固定，内容区滚动**：顶栏、console-nav 侧边栏、页头始终静止；长列表、长表单只在 `console-scroll` 内滚动。切换菜单、滚动列表时，导航和主操作的视觉位置永不移动。
* **滚动区子项不得压缩**：`console-scroll` 的直接子项必须 `flexShrink: 0`，否则 flex 会把卡片压扁（文字被裁）而不是产生滚动（arc-contracts §21.2）。
* **控制台不受站点列宽限制**：控制台内容 100% 满宽，不被 `--aup-content-max`（1200px）框住；公共站点保持原居中列。
* **滚动条只有一条**：控制台页面禁止出现页面级纵向滚动条与内容区滚动条并存的"双滚动条"——看到双滚动条即视为布局缺陷。
* **页头可固定**：内容区内的页头（标题 + 主操作）推荐固定在滚动视口顶部，长列表滚动时主操作保持可见；实现受限时允许页头随内容区一起滚动，但**禁止**页头脱离内容区悬浮。
* **侧边栏不独立滚动**：菜单为四组十三项（见 §2.5），一屏可见；极端窄高下溢出时侧边栏自身滚动，不撑破页面。
* **宽屏不设上限留白**：内容区随视口拉宽，列表与表单利用全部可用宽度；只有长文阅读类内容（预览、正文）才限制最大行宽（约 72 字符）。
* **窄屏例外**：侧边栏折叠为顶部导航后（§7），恢复页面级整页滚动——单栏布局里再嵌套内滚动区域只会制造嵌套滚动灾难。

---

### 2.6 点击去向（控制台右侧内容的打开规则）

控制台是"应用"，右侧内容里的每一次点击都必须**说清楚去哪**：要么留在框架内，要么新标签页，不得把整个控制台替换掉。

| 目标类型 | 行为 | 写法 | 实测证据 |
| --- | --- | --- | --- |
| **控制台节**（15 个） | **就地替换面板**：侧栏、页签容器、其他面板、内层滚动位置都不动 | `action console-nav-<id> href="#<id>"`（或 `view href="#<id>"`） | 点侧栏"媒体"→ URL 变 `#media-admin`、面板就地切换、15 个面板与侧栏 DOM 全部同一对象（arc-contracts §21.14） |
| **写文章 / 外观设置** | **就地替换面板**（已收进控制台，不再是独立页） | `action … href="#compose"` / `href="#appearance"` | 仪表盘"写文章"→ 切到写文章面板，无新标签页 |
| **记录绑定页面**：草稿编辑 `/edit/<slug>`、草稿预览 `/preview/<slug>`、阅读 `/posts/<slug>`、静态页 `/pages/<slug>` | **新标签页**（面板是静态 DSL，承载不了动态 slug；阅读本来就不该打断控制台） | `view href="…" target=_blank` | 帖子行"Hello ArcBlog"→ `target="_blank"` |
| **非 HTML 资源**：RSS `/p/rss.xml`、`llms.txt` | **新标签页** | 同上 | 分发节 RSS / 文章索引均为 `target="_blank"` |
| **非 HTML 资源**：RSS `/p/rss.xml`、`llms.txt` 等 | **新标签页** | 同上 | 分发页的 RSS 订阅 / 文章索引均为 `target="_blank"` |
| **登录跳转**（gate 的 `/.well-known/service/login?return_to=…`） | **同标签页**（登录后回到控制台，属例外） | `action -> navigate "…"` | — |
| **行内写操作**（归档 / 从公开移除 / 发布 / 删除 / 保存 / 授权 / 收录审批…） | **原地执行**，不跳转（不可逆操作带 confirm） | `action -> exec` | — |

平台行为：给 `view href` 或 `action href` 加 `target=_blank` 时，运行时会自动补 `rel="noopener noreferrer"`（实测 DOM：`<a class="aup-action" href="/?page=compose" target="_blank" rel="noopener noreferrer">`）。

**验收口径**：在任一控制台页面执行 `[...document.querySelectorAll('[data-aup-id="console-pane"] a')].filter((a) => !a.target)`，结果必须为空——即右侧内容里不存在"会把控制台整页换掉"的链接。


## 3. 设计 Token

所有样式必须使用 token，禁止硬编码颜色、字号、圆角。token 由主题系统（tone / palette / mode）驱动，自动适配明暗模式。

### 3.1 颜色

| Token | 用途 | 禁止用于 |
| ----- | ---- | ---- |
| `var(--color-surface)` | 卡片、侧边栏底色 | 页面大背景 |
| `var(--color-border)` | 全部边线、分隔 | 文字 |
| `var(--color-dim)` | 次要文字、说明、时间戳 | 标题、关键数据 |
| `var(--color-primary)` | 主按钮、当前菜单、链接 | 大面积填充 |
| 语义色（success / warning / danger / info） | 状态指示 | 装饰 |

规则：

* **一个页面最多出现一个语义色焦点**——满页红色等于没有红色。
* 状态用"色点 + 文字"双编码（`● Online`），不只用颜色（色盲友好）。
* 边线优先于阴影：后台用 `1px border` 分区，不用厚重投影。

### 3.2 圆角与边线

```text
卡片 / 面板    var(--radius-lg, 10px)
按钮 / 输入    主题默认，不覆盖
标签 / 色点    全圆角
```

### 3.3 间距刻度

```text
xs    4px     图标与文字之间
sm    8px / 10px  列表行内、卡片内部 gap（运行时 gap=sm 实测 10px）
md    14px    卡片内边距、元素间距（控制台统一值）
block 20px    运行时 gap=md / 默认卡片内边距（粗旷感的来源，控制台不用）
lg    32px    页面大区块之间
```

**列表行样式（审计后固化）**：行背景**透明**（列表必须 `autoSelect=false`，否则首行是 `--color-accent-bg` 的"选中"底）；上下内边距 `8px 0`（行左右内边距由运行时 `!important` 决定，不可覆盖）；行之间 1px `var(--color-border)` 分隔线；行标题用 `h3` + `fontSize: var(--type-body)`(15px)；元信息用 `scale=sm intent=muted`；**内容型链接不加返回箭头**（`view href` 需 `layout=inline`），返回/外链型保留箭头。

**面板节点用 `view` 而非 `card`**：运行时的 `.aup-view[data-mode="card"]:hover` 会给卡片加 `translateY(-2px)` 上移（并恢复 hover 阴影），而运行时的样式清洗器会丢弃内联 `transform`/`translate`，无法在 AUP 里关掉。因此面板统一写成普通 `view` + 卡片 token（`--card-bg` / `--card-border` / `--radius-lg` / `padding`），外观与卡片一致但没有悬停位移。

**卡片样式（审计后固化）**：`padding: 14px`、`gap=sm`(10px)、`radius: var(--radius-lg)`(10px)、`background` 填充 + **1px `var(--color-border)` 描边**、显式 `boxShadow: "none"`（运行时默认会叠一层 `0 1px 2px` 投影，控制台不要）；卡片自身 `margin: 0`，间距一律由容器 gap 控制（`console-scroll` gap=sm 或网格 gap 14px）。

**控制台精修取值**：卡片 `padding: 14px` + `gap=sm`(10px)、内容区滚动间隔 `gap=sm`(10px)、`console-pane` 上下 `padding: 14px`。实测把卡片内边距从 20px 降到 14px、卡间距从 20px 降到 10px 即去掉"粗旷"感。

禁止出现刻度外的裸数值（如 `margin: 13px`）。

### 3.4 排版

| 层级 | 用法 | 控制台取值 |
| ---- | ---- | ---- |
| `h2` | 页面标题，每页一个 | `fontSize: var(--type-subheading)`（17px，默认 heading 为 21.6px） |
| `h2` / `h3`（卡片内） | 卡片标题、区块标题 | `fontSize: var(--type-body)`（15px） |
| 正文 | 默认字号 | — |
| `var(--type-small)` + `--color-dim` | 辅助说明、时间、元信息 | — |

* 文章标题等关键文字 `line-height: 1.25`，允许 `clamp()` 流式缩放。
* **数字、DID、哈希、金额**使用等宽/表格数字呈现，避免宽度抖动。
* 行内不堆砌超过 3 个信息层级。

---

## 4. 组件标准

### 4.1 状态指示

```text
● Active / Online      success 色点 + 文字
○ Inactive             dim 色点 + 文字
◐ Syncing / Pending    info 色点 + 文字
● Error                danger 色点 + 文字 + 具体原因
```

* 状态点与文字必须同时出现（双编码）。
* Error 状态必须附**具体失败项**：「同步失败：Hub 无响应（重试于 5 分钟前）」，而不是「失败」。

### 4.2 列表与卡片

* 列表行主信息左对齐，状态与操作右对齐；行高一致。
* 缩略图固定尺寸：`flexGrow: 0` + `flexBasis`（AUP 行子元素默认 `flex: 1`，必须显式固定）。
* 卡片只承载一个主题；卡片内最多一个主按钮。
* 列表默认 `autoSelect=false`，避免首行误显示为选中。

### 4.3 按钮层级

```text
Primary     每页最多 1 个    主操作（发布、质押、签发）
Secondary   不限             次要操作（保存草稿、筛选）
Text/Link   不限             行内操作（查看、编辑）
Danger      需确认           删除、撤销质押、退款
```

**控制台按钮统一规则（审计后固化）**

| 项目 | 取值 |
| --- | --- |
| 圆角 | 全部 `var(--radius-md, 8px)`。运行时默认不一致（`primary` 8px、`secondary`/`ghost` 32px），必须内联覆盖 |
| 尺寸档 | 默认档 `padding: 8px 16px`、高度 39px、字号 14.4px；`size=sm` 档 `padding: 5px 12px`、高度 31px、字号 13.6px。同屏只允许这两档 |
| 宽度 | **内容宽**，不得被容器拉伸。卡片是 flex 列（`align-items: stretch`），直接放在卡片里的 action 会被拉成整卡宽 → 必须包一层 `row cross=start` |
| 层级 | 每屏一个 `primary`；次级用 `secondary`（accent 淡底）或 `ghost`；破坏性操作 `destructive` |
| 列表行内按钮 | 若行是 `layout=grid itemStyle=card`，行必须 `cross=start`，否则按钮被拉伸到卡片等高（实测 140px） |

### 4.4 空状态

空状态是**引导页**，不是"暂无数据"四个字：

```text
┌─────────────────────────────┐
│  （留白，不放插画装饰）      │
│  还没有已发布的文章          │
│  发布第一篇文章后，会出现在  │
│  这里并被 Hub 索引。         │
│                             │
│  [ 写新文章 ]               │
└─────────────────────────────┘
```

公式：**一句现状 + 一句价值 + 一个动作**。空状态永远给出下一步。

### 4.5 加载与失败

* 加载用骨架占位（与最终布局同高），禁止白屏和布局跳动。
* 局部失败局部呈现：Hub 列表中单个节点失败只影响该节点卡片，绝不阻塞整页（§113 的界面表达）。
* 失败提示三要素：**发生了什么 + 为什么 + 怎么办**（带重试或跳转）。

### 4.6 确认与打断

| 操作类型 | 模式 |
| ---- | ---- |
| 常规操作（保存、发布） | 直接执行 + 轻提示（toast/状态变化），不弹窗 |
| 不可逆操作（删除、退款、撤销质押） | 确认对话框，说明后果 |
| 高风险授权（agent.publish / economy） | 二次确认 + 明确权限范围（§15.8） |
| 成功反馈 | 原地状态变化优先；不弹"操作成功"对话框 |

---

## 5. 领域信息呈现标准

后台充满 DID、哈希、金额、时间——它们是后台的"专业字体排印"，处理方式统一：

### 5.1 DID / 地址 / 哈希

```text
did:arq:x7f3…k9d2   [复制]
```

* 永远**中间截断**（保留头尾），配一键复制；完整值悬停可见。
* 禁止全量换行展示，禁止只显示前 8 位（尾部同样有区分度）。

### 5.2 金额

```text
128.50 USDC
```

* 金额与资产符号成对出现，缺一不可。
* 对齐小数位（表格数字）；分成展示用「金额 + 比例 + 角色」三元组：`102.80 USDC · 80% · Creator`。

### 5.3 时间

* 默认相对时间（`time mode=display timeMode=relative`：「3 分钟前」），悬停/详情页显示绝对时间。
* 等待期倒计时实时递减（§8.4 取回质押场景），不要静态文字"请等待"。

### 5.4 链上自我声明信息

Hub / Studio 的名称、图标、描述、分类来自链上 NFT data（§8.3）——**必须标注"节点自述"**，视觉上与平台验证信息区分（如 dim 色小字「节点自述信息」），防止把自我声明渲染成平台认证。

### 5.5 角色生命周期

五态（§8.5）用统一的状态条呈现，当前态高亮，下一步操作紧跟其后：

```text
None ── Acquired ── ●Staked ── Revoking ── Claimable
                     当前      [撤销质押]
```

---

## 6. 可见性与权限

* **隐藏而不是禁用**（§15.1）：无能力的菜单不渲染；无权限的操作不出现。
* 唯一的例外是**引导**：角色未激活时，「角色与能力」页显示获取路径（购买 → 质押 → 激活，§8.2），引导不是禁用态，是路线图。
* 质押中锁定的字段（endpoint、地区等 NFT data，§8.3）显示为只读并附一句原因：「质押中不可修改，需先撤销质押并取回」——锁定必须可解释。
* 匿名访客访问控制台：显示登录卡，不显示任何后台数据骨架。

---

## 7. 响应式与弹性

* 桌面优先（后台是生产力工具）；窄屏时侧边栏折叠为顶部导航，内容区不横向滚动。
* 滚动归属随断点切换：桌面为"页面固定 + 内容区内滚动"（§2.3）；折叠为单栏后恢复页面级整页滚动，禁止单栏内再嵌套滚动区域。
* 列表在窄屏下降级为卡片堆叠，关键操作保持可见。
* 中英文文案长度差异可达 2 倍：按钮与标签不得写死宽度，布局必须容忍文案换行。
* 所有文案走 i18n key（页面作用域），禁止硬编码文案；导航文案集中在 wrapper 命名空间。

---

## 8. AUP 落地约束

设计标准必须在 AUP 现实中可执行（详见 developer-guide.md）：

| 标准 | AUP 落地方式 |
| ---- | ---- |
| 控制台骨架一致 | 侧边栏（含扁平样式与侧栏页脚）由 `scripts/console-nav.mjs` 统一生成，`--check` 进测试门禁；顶栏由页面内的 `view console-topbar` 承载，公共页由各自页面承载 |
| 全高流式布局 | `row console-shell … style={height: "calc(100vh - 130px)"}` + `view console-pane … size={flex: 1} style={overflowY: "auto", height: "100%"}`。130px 是实测的页面 chrome 高度（页内 topbar 48 + 页面根 gap 30 + scroller gap 20 + 底部内边距 32），平台没有"剩余高度"原语，改版顶栏后需复测（arc-contracts §21.2） |
| 只用 token | safe-style 白名单：`background` 简写可用，`backgroundImage/backgroundPosition` 会被丢弃—— layered 背景写 `background: <color> url(...) center / cover no-repeat` |
| 权限驱动显隐 | `visible=$session.authenticated`；异步数据用插值形式 `visible="${state.post.x}"`（表达式形式只求值一次） |
| i18n | key 页面作用域 + flat dotted 存储；`arcblog-locales.mjs --check` 防止死 key |
| 导航 | 列表 select 事件不能跳转——用 `view href` 链接 |
| 明暗模式 | 由 theme bridge 统一驱动；页面不自行判断 mode |
| 表单预填 | 用 `value="${state.x}"`（直接属性插值）；**不要** `state={value: "${...}"}`——嵌套对象 prop 不插值，会渲染字面量（arc-contracts §19） |
| 空态文案 | `emptyText` 的 `$t()` 运行期不求值（arc-contracts §20）。**单记录**空态用 `propBind` 探针 + `visible="!${state.x}"` 条件渲染引导卡；**列表**是否为空无法探测，引导用列表后的常驻 dim 说明承载 |
| 角色级显隐 | `$session` 只有 did/displayName/authenticated，**没有 role**；非管理员会话按 guest 计。admin-only 列表对非管理员显示运行时拒绝文案是平台行为——控制台面向运营者，不为隐藏它而发明未验证的机制（§150） |
| 局部刷新 / 路由 | **列表**：`afs-list subscribe=true` 会在 AFS 写入后自动重渲染该区域（WS 事件 + 运行时 live 协调器，含 45s 轮询兜底）——列表数据一律靠它保持新鲜。**页面**：`-> page` 是同标签页内的页面整体替换（框架不动、无文档重载）。**单页内的区域级就地切换用 `view mode=tabs`**（实测：切换零往返、侧栏与面板 DOM 复用、隐藏面板订阅仍在刷新，arc-contracts §21.13）——同一节内的子视图/列表+详情用它，跨节切换仍用"一事一页 + `-> page`"以保住深链。**节点级 `set` 在本实例不可用**：`action -> set <非 _root 节点> …`（`src` / `props{src}` 两种写法）实测被会话拒绝（`AUP node not found: <id>`，arc-contracts §21.12），所以"侧栏固定、只换右栏"只能靠**订阅区域**或页面级切换实现。**单记录 `propBind` 有首屏竞态**：数据变化时它会更新，但首次打开时若渲染早于绑定解析，卡片会保持空白直到一次数据变化或页面重新渲染（arc-contracts §21.11）。因此单记录空白不得解释为"数据不存在"；运营者用页内切页往返即可恢复，彻底修法（嵌套字段可见性 / 改订阅列表）需按竞态做多次新开页验证后再定 |

---

## 9. 页面验收清单

任何新增或修改的控制台页面，提交前逐项过检：

```text
□ 骨架：侧边栏由 console-nav 生成，--check 通过
□ 布局：宽高 100% 流式；页面固定无纵向滚动条，滚动只发生在 console-pane 内（无双滚动条）
□ 页头：标题 + 一句话说明 + 至多一个主操作
□ Token：无硬编码颜色 / 字号 / 间距 / 圆角
□ 状态：空状态有引导和动作；加载有骨架；错误三要素齐全
□ 双编码：状态不只依赖颜色
□ 数据：DID/哈希中间截断可复制；金额带符号；时间相对+绝对
□ 权限：无能力即隐藏；锁定字段附原因；匿名只见登录卡
□ 打断：无"成功"弹窗；不可逆操作有确认且说明后果
□ i18n：中英文布局都成立，无写死宽度
□ 克制：没有为填满空间而存在的内容
□ 点击去向（§2.6）：控制台页面框架内切换；公共/独立页面与非 HTML 资源新标签页；
  右侧内容里不存在会把控制台整页替换掉的链接（`console-pane a` 全部有 target）
```

---

## 10. 一句话总结

> 优雅的 ArcBlog 后台：运营者永远知道**现在是什么状态、下一步做什么、点下去会发生什么**——不多不少。

---

## 附录 A：布局参考范本（给 AI 实现时的参照）

§2.3 是标准，本附录是**喂给 AI 的原材料**。给 AI 的正确姿势是「一份骨架 + 一个真实案例 + 本页验收标准」，而不是一串仓库链接——给多了它会跨框架混搭。

### A.1 与框架无关的 CSS 骨架（首选）

仓库内可运行版本：[docs/reference/console-shell-layout.html](reference/console-shell-layout.html)（含正确/反例切换，浏览器直接打开）。

```css
html, body { height: 100%; margin: 0; }

.app-shell {
  height: 100dvh;                 /* 优先 dvh：移动端地址栏不吃高度 */
  display: grid;
  grid-template-rows: auto 1fr;   /* app-header / 剩余空间 */
  grid-template-columns: 200px 1fr;
  grid-template-areas:
    "header header"
    "nav    pane";
  overflow: hidden;               /* 关键 1：页面自身永不出现滚动条 */
}

.app-header   { grid-area: header; }
.console-nav  { grid-area: nav;  overflow-y: auto; }                    /* 仅极端窄高时自滚 */
.console-pane { grid-area: pane; overflow-y: auto; min-height: 0; }     /* 关键 2：唯一滚动条 */
.page-head    { position: sticky; top: 0; }                             /* 页头固定，主操作常驻可见 */
```

AUP 落地时对应的是**结构而不是这段 CSS**：`row console-shell` ≈ `.app-shell`，`view console-nav` ≈ `.console-nav`，`view console-pane` ≈ `.console-pane`；高度与滚动通过 `size={height: "100%"}` 与 `style={overflowY: "auto"}` 表达（§8）。

**AI 最常犯的三个错**（评审时优先查这三条）：

1. **漏 `min-height: 0`**——grid/flex 子项默认 `min-height: auto`，会被内容撑高，于是「内容区滚不动，整页反而出现滚动条」，正好是 §2.3 禁止的双滚动条。
2. **用 `100vh` 而不是 `100dvh`**——移动端地址栏收起/展开时高度跳变。
3. **祖先容器给了固定高度或裁剪，却没给滚动容器留收缩余量**，内容被直接裁掉（表格最后一行点不到）。

### A.2 完整应用外壳案例

| 参考 | 看什么 | 提醒 |
| ---- | ---- | ---- |
| [Every Layout · The Sidebar](https://every-layout.dev/layouts/sidebar/) | 无断点的 sidebar/content 分割：`flex-basis` + `flex-grow: 999` + `min-inline-size: 50%`，窄容器自动堆叠。纯 CSS、无框架，最值得先给 AI | 只解决"横排还是堆叠"，不涉及高度与滚动归属 |
| [shadcn/ui Sidebar blocks](https://ui.shadcn.com/blocks/sidebar) | `SidebarProvider` + `SidebarInset` + `flex-1 overflow-auto`：页头固定、内容区滚动的现代范式 | React + Radix + Tailwind，**只抄结构不抄 API** |
| [Tabler](https://github.com/tabler/tabler) | 纯 HTML/Bootstrap 后台套件，`page-wrapper` / `page-body` 的滚动分层可直接读 | 体量大，只看 layout 相关样式 |
| [Ant Design Pro](https://github.com/ant-design/ant-design-pro) | 固定 header + 固定 sider + 内容区滚动的经典后台范式 | 观念参照；实现架构与本项目无关 |

真实产品可作行为参照：VS Code、Grafana——导航常驻、滚动只发生在编辑区/面板区，可直接观察"页头不动、内容滚"的手感。

### A.3 提示词模板

```text
目标：AUP DSL（row / view / size / style），不是 React，也不是原生 HTML/CSS。
标准：docs/ArcBlog-admin-ui-design.md §2.3 + 附录 A.1。
参照：附录 A.1 的 CSS 骨架，加附录 A.2 中一个案例的 DOM 结构。
交付后自检：① 页面无纵向滚动条 ② 无横向滚动 ③ 滚动只发生在 console-pane
          ④ 滚动时页头与侧边栏静止 ⑤ 无固定像素页宽 ⑥ 宽高均 100% 流式。
```
