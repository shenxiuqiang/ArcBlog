# ArcBlog 管理后台 UI 设计标准

> 让后台优雅的标准：不是更多装饰，而是更少意外。

**文档版本：** V1.8（Round 13 · 2026-09-28，授权书 **Lead L-R13-1** + [REQ-016](team/requirements/REQ-016-v3-aii-and-visual-debt.md) §1.5 四项 + 版本行：§4.3 的 destructive 现状块由「记为 R12 设计项」改为**已实施**（路径 A-ii：静息文字 `var(--color-text)` 12.65:1、hover 文字 `var(--color-surface)` 5.47:1，红只留 1px 描边 + 图标；令牌与 `.aup` 零改动）；§3.1 新增「平台 `destructive` variant 文字/描边/图标同色 → 与淡底同色相时破 AA」的口径；§9 新增 **2 条**条目与对应可执行断言（`destructive` 静息/hover ≥4.5:1；命中区 ≥24×24，按 REQ-015 R3 探针**态①** 写硬断言）；§3.4 补 **D6** 判据（卡片内 `h2` 承担该页唯一可见标题 → 17px）；另把 §4.3 姊妹行「V3 方案指向」的状态词从「未实施」对齐为「已实施」。**既有期望值、既有断言表达式、既有 §9 条目逐字节未动**（§9 只增不减）；逐条 before/after 与原始实测值见 [UI-010](team/design/UI-010-v3-aii-implementation.md)）· V1.7（Round 11 · 2026-09-28，授权书 **D27 文档对齐：D1–D5 + V3/V8 裁定写入标准**：§3.3 写入 gate 卡 20px 豁免（D1，引 Lead D4）与 `auto-surface` 免责（D3）；§4.3 尺寸档高度改准为实测口径 36/38/29px（D2）；§2.1 菜单项内边距改准为 `8px 20px 8px 32px`（D5）；§2.5 + §9 写入「节数 ≥ 18 侧栏自滚可接受、页脚须可滚动到达」（V8/D24）；§4.3 记录 destructive 文字 3.99:1 为 R12 设计项（V3/D23）；另附带对齐 3 处过期的节数示例值（5 组 18 项）。**期望值、断言表达式、§9 条目结构逐字节未动**；逐条 before/after 见 [UI-008](team/design/UI-008-standard-gap-closure.md)）· V1.6（Round 11 · 2026-09-28，授权书 **L-R11-2 事实对齐**：§2.1「选中菜单项 / 当前菜单项」两行由「深色实心块（`background: var(--color-text)`）」改为实测的平台 `active=true` **强调色块**（`--color-accent-bg` / `--color-accent`，与 §2.3 第 122 行一致），并把「两者文字左缩进均为 20px」改准为实测 **32px**；期望值与 §9 条目未动。逐条 before/after 见 [UI-007](team/design/UI-007-console-pixel-walkthrough.md) §7.2）· V1.5（Round 10 · 2026-09-28 落盘（授权书 2026-09-27，**L-R10-1 事实对齐**）：**残留收口**——(a) §9 第 2 条条目文字里的 `console-pane` 按 §2.5 / §8 既有范式标注为本文档的**概念名**（条目判据与 `^□` 十二条不变）；(b) 附录 A.1 的参考 CSS 类名与提示词模板里的 `console-pane` / `console-shell` 同范式标注（CSS 骨架与 `docs/reference/console-shell-layout.html` 引用未动）；(c) 附录三处 §2.3 交叉引用改准为「§2.3 结构 + §2.5 滚动」（双滚动条那处直指 §2.5）。三项**只做事实对齐**：期望值、§9 条目结构、两个等价断言块逐字节未动。逐条 before/after 见 [UI-006](team/design/UI-006-appendix-residuals.md)，上一轮见 [UI-004](team/design/UI-004-ui-standard-assertion-and-residuals.md)）

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
│ 侧栏     │  内容列：唯一滚动区 ⇅        │ │
│          │                                   │ │
└──────────┴───────────────────────────────────┘ ▼
```

页面整体锁定视口高度，**只有右侧内容列的滚动容器内部滚动**（`console-scroll` 只是本文档的**概念名**，实现里没有这个选择器）——滚动归属详见 §2.5，实现公式见 §8。

| 项 | 标准 |
| -- | ---- |
| 顶栏 | 由 `.aup/wrapper.aup` 的 `view mode=shell` **一处**承载 `app-header`（所有页面共用，**不是**页面内的块）：容器 `width: 100vw` + `marginLeft: calc(50% - 50vw)`、高度钉死 `48px`；`mode=shell` 渲染为 `data-mode="shell"`，豁免运行时对 wrapper 直接子元素的 `--aup-content-max`(1200px) cap，因此真正满宽贴边（`arc-contracts.md` §27.5）。控制台页根 `height: calc(100vh - 48px)` 里的 `48px` 就是它的实测高度，改顶栏高度必须复测（§8） |
| 侧边栏样式 | **扁平、贴左边缘、与顶栏/视口底部零间距**：容器无边框无圆角无内边距（`padding: 0`、`gap: 0`），与右侧内容之间 1px 右分割线；菜单项无边框无圆角、左对齐满宽、内边距 `8px 20px 8px 32px`（2026-09-28 实测：垂直 8px、右 20px、**左 32px**——左侧 32px 就是下行「菜单项（二级）」的层级缩进，同一行只有一个左缩进，不是两套取值）；项与项之间、分组之间各 1px 浅分割线 |
| 侧边栏宽度 | `clamp(200px, 15vw, 280px)` + `flexShrink: 0` —— 宽度随视口流式（取 clamp 的上下限），**不再写固定像素**；1803px 视口复测 270.44px（= 15vw，正是该 clamp 的计算值） |
| 选中菜单项 | **强调色块**（平台 `active=true` 渲染：实测 `background: var(--color-accent-bg)` = `rgba(42,110,0,.08)` + 文字 `var(--color-accent)`，见 §2.3 与 [`arc-contracts.md`](arc-contracts.md) §23），**与未选中项共用同一左对齐内边距**（2026-09-28 实测两者 `padding-left` 均为 32px）；不使用 `variant=primary`（它会居中标签造成位移） |
| 分组名称（一级） | 独立背景带（`background: var(--color-bg)`）+ 文字左缩进 **20px**，与二级菜单形成层次 |
| 菜单项（二级） | 文字左缩进 **32px**（比一级多 12px 的层级缩进），满宽、左对齐 |
| 当前菜单项 | **强调色块**（同上：平台 `active=true` → `data-active="true"` + `aria-current="page"`，由运行时按 accent token 上色；写在 `action` 上的内联 `background`/`color` 会被运行时的安全样式过滤丢弃，[`arc-contracts.md`](arc-contracts.md) §23），与未选中项同一左对齐内边距；**不用** `variant=primary`（它居中标签） |
| 侧栏页脚 | 控制台不渲染站点页脚（`app-footer`），品牌/关于/RSS/版权收进侧栏底部（容器 `marginTop: auto` + 顶部 1px 分割线），由 `scripts/console-nav.mjs` 生成进每个控制台页——是侧栏内唯一的站点级入口；「关于」`href="/?page=about"`（唯一无 `target` 的行）、「RSS」`href="/p/rss.xml"`（`target=_blank`） |
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

### 2.3 控制台结构（一节一页，`?page=<name>`）

控制台**每个菜单节都是一个真实页面**：用 `?page=<name>` 直达，左侧侧栏被投影进**每一个**控制台页，右侧只放本节内容。深链就是 URL 本身——刷新、分享、书签都直接落到该页，不需要任何脚本或运行时状态来恢复视图。

```text
/?page=posts
┌──────────────────────────────────────────────────────────┐
│ 顶栏（app-header：品牌 / 主题 / 语言 / 用户菜单）100vw 满宽 │
├──────────────┬───────────────────────────────────────────┤
│ 内容          │  你的工作室                                │
│  仪表盘       │  在一个与钱包绑定的工作区中管理…             │
│  工作室 ←     │  ┌─────────────────────────────────────┐  │
│  页面         │  │ 生命周期控制 / 你的内容 / 列表 …      │  │
│  写文章       │  └─────────────────────────────────────┘  │
│ 站点 / 运营 / 经济 …                                        │
└──────────────┴───────────────────────────────────────────┘
```

* **一事一页**：节与分组由 `scripts/console-nav.mjs` 定义，数量以 `CONSOLE_SECTIONS.length`（组数以 `CONSOLE_MENU.length`）为准，**本文档不写死数字**；当前值用下面的命令读：

  ```bash
  node -e "import('./scripts/console-nav.mjs').then(m=>console.log('groups='+m.CONSOLE_MENU.length,'sections='+m.CONSOLE_SECTIONS.length))"
  # → groups=5 sections=21（2026-09-28 实测·UI-012 事实对齐；一律以此命令输出为准）
  ```

* **侧栏只定义一次，由生成器投影进每个控制台页**：菜单模型在 `scripts/console-nav.mjs`；`node scripts/arcblog-console-nav.mjs` 重建各页侧栏，`node scripts/arcblog-console-nav.mjs --check` 是漂移门禁（进 `npm test`）。AUP 没有可用的跨页片段机制（`arc-contracts.md` §22 / §25.2），所以共享外壳只能"生成 + 守卫"。
* **切页是普通页面导航**：侧栏行是 `action "$t(wrapper.nav-*)" -> page <name>`，点击切到对应页面（同标签页内的整页替换，框架与 JS 上下文不重载）。跨节没有"就地换面板"这回事——那是 B′ 之前的形态。
* **当前行用平台自带的 `active=true`**：生成器只给本页那一行写 `active=true`，运行时渲染为 `data-active="true"` + `aria-current="page"`，并由运行时样式表按 accent token 上色（`arc-contracts.md` §23）——不手写颜色，换主题自动跟随；生成器保证每页恰好一行（`scripts/arcblog-console-nav.mjs --check` + `scripts/arcblog-console-nav.test.mjs` 守住；2026-09-27 实测 17/17 页各 1 行）。
* **菜单行用 `action -> page`，不用 `view href`**：`view href` 会被运行时插入「←」箭头且不铺满整行（`arc-contracts.md` §21.4）。
* **单页内的区域级切换**：同一节内确有多个子视图（列表 + 详情、向导多步）时用 `view mode=tabs`（`arc-contracts.md` §21.13）；它不进入 URL，跨节分享仍然靠 `?page=<name>`。

### 2.35 页脚布局

公共页页脚（`app-footer`）的固定排版：**横线在页脚顶边**（不是内容与版权之间），随后是「品牌 + 标语」在左；**右侧是一块右对齐的两行**——第 1 行站点链接（About / Store / Author / RSS），第 2 行 `© 2026 ArcBlog`，两行右边缘与页脚内容右边缘对齐（`REQ-026` / UI-013：页脚总高 **139.14px → 119.14px**，省掉原来那条全宽版权底栏行；实现在 theme-bridge 的 `CHROME_CSS`：`.aup-app-footer` 用 `display:grid` 两行两列，`.aup-footer-top{display:contents}` 让链接块成为网格项；`≤640px` 回退平台堆叠布局）。

| 规则 | 落地方式 |
| --- | --- |
| 横线在顶边、内部无横线 | 覆盖 `.aup-app-footer` 的 `border-top` 与 `.aup-footer-bottom-bar` 的 `border-top` |
| 链接一行靠右 | `.aup-footer-column` 改 `flex-direction:row`、`.aup-footer-columns[data-count="1"]` 右对齐 |
| 注入位置 | theme bridge 注入的 `#arcblog-chrome-style`（随 render 幂等重放），改版需复测（arc-contracts §21.15） |

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
宽度   100% 流式：console-pane（本文档的概念名，实现里没有这个选择器）flex: 1 随视口伸缩，无固定页宽，无横向滚动
高度   100% 锁定：console-shell（本文档的概念名，实现里没有这个选择器）撑满视口剩余高度，页面不出现纵向滚动条
滚动   单一归属：只有右侧 console-pane（本文档的概念名，实现里没有这个选择器）内部纵向滚动（overflow-y: auto）
```

> 上一段代码块里的 `console-pane` / `console-shell` 与 §2.1 的 `console-scroll`、§8 的 `console-topbar` 同类：**都是本文档的概念名**，仓库里没有这些选择器（`grep -rnE 'console-pane|console-shell|console-scroll|console-topbar' .aup/ scripts/` 命中 `0`），真正的承载是 `.aup/wrapper.aup` 的 `view mode=shell` 顶栏 + 内容列 `view size={flex: 1} style={overflowY: auto}`（§8）。**标准口径（100% 流式 / 高度锁定 / 滚动单一归属）不变**，只是不再把这些名字读成实现。

规则：

* **页面固定，内容区滚动**：顶栏、console-nav 侧边栏、页头始终静止；长列表、长表单只在右侧内容列的滚动容器内滚动（`console-scroll` 只是本文档的**概念名**，承载方式见 §8）。切换菜单、滚动列表时，导航和主操作的视觉位置永不移动。
* **滚动区子项不得压缩**：内容列滚动容器的直接子项必须 `flexShrink: 0`，否则 flex 会把卡片压扁（文字被裁）而不是产生滚动（arc-contracts §21.2）。
* **控制台不受站点列宽限制**：控制台内容 100% 满宽，不被 `--aup-content-max`（1200px）框住；公共站点保持原居中列。
* **滚动条只有一条**：控制台页面禁止出现页面级纵向滚动条与内容区滚动条并存的"双滚动条"——看到双滚动条即视为布局缺陷。
* **页头可固定**：内容区内的页头（标题 + 主操作）推荐固定在滚动视口顶部，长列表滚动时主操作保持可见；实现受限时允许页头随内容区一起滚动，但**禁止**页头脱离内容区悬浮。
* **侧边栏不独立滚动（默认；节数 ≥ 18 时例外，见下条口径）**：菜单项数以 `scripts/console-nav.mjs` 的 `CONSOLE_SECTIONS.length` 为准（分组数以 `CONSOLE_MENU.length` 为准；**本文档不写死数字**，2026-09-28 实测 5 组 21 项（原记 18 项，UI-012 事实对齐），一律以命令输出为准），默认一屏可见；**节数 ≥ 18 时菜单总高超过一屏预算，侧栏自身滚动是可接受形态**（该容器 `overflowY: auto`，不撑破页面、不产生双滚动条）——此时的验收口径是「**页脚（品牌 / 关于 / RSS / 版权）必须能通过侧栏自身滚动到达**」，**不要求页脚首屏可见**（Lead **D24** 裁定，2026-09-28）；极端窄高下溢出同此口径。实测：18 节时 1803×908 下侧栏 `scrollHeight - clientHeight` = **56px（en）/ 86px（zh）**（UI-007 §2 V8），而 17 节时同算式刚好放得下；**21 节复测（UI-011 §0.3，2026-09-28）：同算式 = 161px，`footerReachable = true`**——「页脚必须能滚到」这一验收口径不变。
* **宽屏不设上限留白**：内容区随视口拉宽，列表与表单利用全部可用宽度；只有长文阅读类内容（预览、正文）才限制最大行宽（约 72 字符）。
* **窄屏例外**：侧边栏折叠为顶部导航后（§7），恢复页面级整页滚动——单栏布局里再嵌套内滚动区域只会制造嵌套滚动灾难。

> 菜单口径的读取命令（改菜单只改 `scripts/console-nav.mjs`；**不要在文档里写死数字**）：
>
> ```bash
> node -e "import('./scripts/console-nav.mjs').then(m=>console.log('groups='+m.CONSOLE_MENU.length,'sections='+m.CONSOLE_SECTIONS.length))"
> # → groups=5 sections=21（2026-09-28 实测·UI-012 事实对齐；一律以此命令输出为准）
> ```

---

### 2.6 点击去向（控制台右侧内容的打开规则）

控制台是"应用"，右侧内容里的每一次点击都必须**说清楚去哪**：要么留在框架内，要么新标签页，不得把整个控制台替换掉。

| 目标类型 | 行为 | 写法 | 实测证据 |
| --- | --- | --- | --- |
| **切换控制台节**（一节一页，节数以 §2.5 为准） | **整页替换**：侧栏与框架不动，右侧换成目标页内容（同标签页内，无文档重载） | `action "$t(wrapper.nav-*)" -> page <name>` | 点侧栏「媒体」→ URL 变 `?page=media`，右侧渲染该页；实测（2026-09-27，1803×908）17/17 页每页恰好 1 行 `data-active="true"` / `aria-current="page"` |
| **写文章 / 外观设置** | 同上的整页切换（两者各自是真实页面） | `action -> page compose` / `-> page appearance` | 仪表盘「写文章」→ `?page=compose`，无新标签页 |
| **记录绑定页面**：草稿编辑 `/edit/<slug>`、草稿预览 `/preview/<slug>`、阅读 `/posts/<slug>`、静态页 `/pages/<slug>` | **新标签页**（面板是静态 DSL，承载不了动态 slug；阅读本来就不该打断控制台） | `view href="…" target=_blank` | 帖子行"Hello ArcBlog"→ `target="_blank"` |
| **非 HTML 资源**：RSS `/p/rss.xml`、`llms.txt` | **新标签页** | 同上 | 分发节 RSS / 文章索引均为 `target="_blank"` |
| **登录跳转**（gate 的 `/.well-known/service/login?return_to=…`） | **同标签页**（登录后回到控制台，属例外） | `action -> navigate "…"` | — |
| **行内写操作**（归档 / 从公开移除 / 发布 / 删除 / 保存 / 授权 / 收录审批…） | **原地执行**，不跳转（不可逆操作带 confirm） | `action -> exec` | — |

平台行为：给 `view href` 或 `action href` 加 `target=_blank` 时，运行时会自动补 `rel="noopener noreferrer"`（实测 DOM：`<a class="aup-action" href="/?page=compose" target="_blank" rel="noopener noreferrer">`）。

**验收口径（执行前提：admin 会话、视口 1803×908）**：在任一控制台页面的**内容区滚动容器**里执行下面的断言，结果必须是 `0`——即右侧内容里不存在"会把控制台整页换掉"的链接。生成器已改为 id-less（`arc-contracts.md` §25.3），所以按"内容区滚动容器"定位，不能按某个 `data-aup-id` 取节点：

```js
// 内容区滚动容器内的无 target 链接数 —— 期望 0（原断言；对视口敏感，判定见下面的等价断言）
[...document.querySelectorAll('*')]
  .filter(el => el.scrollHeight > el.clientHeight + 2
    && /auto|scroll/.test(getComputedStyle(el).overflowY)
    && !el.querySelector('.aup-app-header'))   // 排除承载框架顶栏的页面级滚动容器
  .pop()?.querySelectorAll('a:not([target])').length ?? 0
```

> **原断言为什么必须限定视口（BUG-011）**：它只排除"含 `.aup-app-header` 的容器"，再用 `.pop()` 取**最后一个**候选——候选集合与"取到哪个容器"都随视口变化。UI 自跑 CDP 探针（admin 会话，同一探针、只改视口，原始 JSON 见 [UI-004](team/design/UI-004-ui-standard-assertion-and-residuals.md) §2）实测两轮：
>
> * **BUG-010 修复前**（Dev 落盘 BUG-010 之前，2026-09-28 00:2x；Dev 的 `.aup/pages/admin/compose.aup` mtime = 2026-09-28 00:34，UI 复跑早于它；当时 `?page=compose` 尚无内容列滚动容器）：**1803×908** 下只有 1 个滚动容器且它包含 `.aup-app-header` → 过滤后候选集合**为空**、`.pop()` 为 `undefined`、`?? 0` 兜底给出 `0`（**空心通过**，根本没有检查过内容列）；**1512×765** 下滚动容器为 2 个，`.pop()` 取到侧栏容器（内含侧栏页脚「关于」链接 `href="/?page=about"`）→ 同一断言给 **1**。
> * **BUG-010 修复后**（2026-09-28 00:3x，`?page=compose` 已有内容列）：`?page=compose` 两视口都变回 `0`（修复奏效），但同一条原断言在 **`?page=appearance`** 上重演同一缺陷——1803×908 → `0`（候选集合仍为空）、1512×765 → **1**。
>
> 两轮证据合起来说明：**这是原断言自身的缺陷（`0` / `1` 随视口漂移），不是某一页的偶发**——修好一个页面的容器结构，缺陷就换一个页面出现。因此原断言只在 1803×908 下可作参照，**不得单独作为验收依据**；判定一律用下面的等价断言。

**等价断言（判定以此为准）——只针对内容列：`candidates` 必须 ≥ 1，且 `total` 必须为 `0`**。内容列 = `overflowY` 为 `auto|scroll` 的**布局容器**，并排除三类元素：① **框架顶栏**（`.aup-app-header` 的任何祖先容器）；② **侧栏**（含 `[data-active="true"]` 当前项的容器——侧栏与它的页脚链接同属一个容器）；③ `INPUT` / `TEXTAREA` / `SELECT` 这类 UA 默认 `overflowY: auto` 的**表单控件**（不排除的话，`?page=compose` 的正文 `textarea` 会被误当成内容列，又会得到一个空洞的 `0`）。`candidates ≥ 1` 是硬门槛：候选集合为空说明断言没找到内容列，结论无意义，**不得**像 `?? 0` 那样兜底成 `0` 而放行。**注意不能按"当前是否真的溢出"定位内容列**——内容短于一屏时（如 1803×908 的 `?page=dashboard`，内容列 724/724）`scrollHeight > clientHeight + 2` 不成立，候选会变成 0，验收将无法通过。

```js
// 只针对内容列的等价断言 —— 期望 total 0，且 candidates >= 1
(() => {
  const header = document.querySelector('.aup-app-header');
  const activeNav = document.querySelector('[data-active="true"]');
  const isFormControl = el => /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName);
  const contentColumns = [...document.querySelectorAll('*')].filter(el =>
    /auto|scroll/.test(getComputedStyle(el).overflowY) && !isFormControl(el) &&
    !(header && el.contains(header)) &&
    !(activeNav && el.contains(activeNav)));
  return {
    candidates: contentColumns.length,        // 必须 >= 1，否则不算通过
    linksPerColumn: contentColumns.map(el => el.querySelectorAll('a:not([target])').length),
    total: contentColumns.reduce((n, el) => n + el.querySelectorAll('a:not([target])').length, 0), // 期望 0
  };
})()
```

期望 `0`。原断言实测（2026-09-27，admin 会话，视口 1803×908）：17/17 控制台页均为 `0`。**更正（2026-09-28，BUG-010 修复后复跑，见 [UI-005](team/design/UI-005-bug014-measurement-note.md)）**：本条原先以「**`!el.querySelector('.aup-app-header')` 不是可选项**」立论，依据是去掉该过滤后 `?page=compose` 的计数变成非零（BUG-010 之前的旧测量为 `2`，命中的是框架 chrome 两条链接——wrapper 顶栏品牌链接 `a.aup-app-header-brand-link` → `href="/"`、侧栏页脚「关于」链接 `a.aup-action` → `href="/?page=about"`），那是 **BUG-010 之前**的旧测量（当时 `.pop()` 取到的是含 `.aup-app-header` 的整壳容器，那两条 chrome 链接在它里面）。BUG-010 修复后 `?page=compose` 已有独立内容列，同一探针复跑：**去掉该过滤后 1803×908 与 1512×765 都是 `0`**（1803×908：唯一滚动容器就是内容列 1471×744；1512×765：两个容器中 `.pop()` 取到的是内容列 1223×601，侧栏容器在前）——**该过滤项在 `?page=compose` 上已不再产生差异，不要再用"去掉过滤会变成非零"当论据**（它仍留在原断言里，语义是排除承载顶栏的页面级壳容器，并无害处）。原断言的视口漂移现改在 `?page=appearance` 上重现：1512×765 **带 / 不带过滤都是 `1`**（`.pop()` 命中侧栏容器，其页脚「关于」链接），1803×908 则无任何可滚动容器、`?? 0` 空心给出 `0`。因此**该过滤项只属于"仅 1803×908 可作参照"的原断言；期望值仍为 `0`，判定一律以等价断言为准，且不依赖任何一条 chrome 的条数**。对照页 `?page=posts` / `?page=tags` 带不带过滤都是 `0`（原始输出见 [BUG-008](team/bugs/BUG-008-admin-ui-design-section-9-note-not-reproducible.md)）。

等价断言实测（**UI 自跑**，admin 会话，同一探针跑两视口，原始 JSON 见 [UI-004](team/design/UI-004-ui-standard-assertion-and-residuals.md) §2）：**BUG-010 修复后**（2026-09-28 00:3x）`?page=compose` / `?page=appearance` / `?page=posts` / `?page=tags` / `?page=dashboard` 在 1803×908 与 1512×765 下**全部**为 `candidates: 1, total: 0`——**两视口结论一致**（与同一状态下原断言在 `?page=appearance` 给出的 `0` / `1` 漂移形成对照）；**BUG-010 修复前**（2026-09-28 00:2x）`?page=compose` 两视口均为 `candidates: 0`，等价断言**不通过**（如实暴露"该页没有内容列"这一实现缺口，而不是像原断言那样兜底放行）。全部控制台页的等价断言复跑由 QA-004（`task-14`）在同一 admin 会话内执行。


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
* **平台 `destructive` variant 的文字 / 描边 / 图标同色**（都取 `--color-error`，页面写法里的 `--color-danger` 只是它的别名）；**当文字与淡底同色相时会破 AA**，必须由 `color` 覆写或 variant 选择处理（现状与已实施口径见 §4.3；Round 13 实测，[UI-009](team/design/UI-009-v3-contrast-and-visual-debt.md) §1.1/§1.5）。

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

**卡片样式（审计后固化）**：`padding: 14px`、`gap=sm`(10px)、`radius: var(--radius-lg)`(10px)、`background` 填充 + **1px `var(--color-border)` 描边**、显式 `boxShadow: "none"`（运行时默认会叠一层 `0 1px 2px` 投影，控制台不要）；卡片自身 `margin: 0`，间距一律由容器 gap 控制（内容列滚动容器 gap=sm 或网格 gap 14px）。

**控制台精修取值**：卡片 `padding: 14px` + `gap=sm`(10px)、内容区滚动间隔 `gap=sm`(10px)、`console-pane`（本文档的概念名，实现里没有这个选择器，承载方式见 §8）上下 `padding: 14px`。实测把卡片内边距从 20px 降到 14px、卡间距从 20px 降到 10px 即去掉"粗旷"感。

**登录门（gate）卡豁免（Lead D4 裁定，本轮写入标准）**：未登录时渲染的**登录门卡**（gate 卡）**豁免**上面的「控制台统一 14px」，保持现状 **`padding: 20px`**——**登录门 ≠ 控制台内容卡**（Lead 2026-09-27 **D4** 裁定，留档见 [REQ-002](team/requirements/REQ-002-console-consistency-fixes.md) §3 A6：「gate 卡（未登录登录门）豁免本口径，保持现状 20px……不得再要求『17 页 gate 卡 20px→14px』」）；因此**不得**再要求把 gate 卡从 20px 改成 14px。实测依据：UI-007 §5——17/17 页 guest 上下文 gate 卡 `padding: 20px`，同一实例的 admin 内容卡 `padding: 14px`；`?page=compose` / `?page=compose-edit` 的 gate 卡同口径（REQ-004 §A5 顺手项）。

**平台原语 `auto-surface`（`?page=appearance`）不受本节与 §3.4 管辖（免责）**：`auto-surface` 是平台原语，其外壳与内层结构、内边距（内层由平台自带 **20px**）、阴影（`0 1px 2px rgba(26,26,31,.08)`）与内层标题字号（平台默认 **21.6px**）全部由平台渲染、**不读**页面内联 `style`，控制台无法把它对齐到本节的 14px 与 §3.4 的 17px。因此该页内容区天然是「平台外观」，**§3.3 的 `14px` 与 §3.4 的 17px 在 `?page=appearance` 上不适用**（§9「Token」「布局」两项按此豁免判定）。实测见 UI-007 §3.1（外壳 `padding: 0px` + `boxShadow: 0 1px 2px rgba(26,26,31,.08)`、内层 `settings-section` 自带 `padding: 20px`、内层 `h2` 21.6px）。

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
* **D6 判据（Round 13 补齐，解决 R1b 歧义）**：**卡片内的 `h2` 若承担该页唯一可见标题 → 按页面标题（17px，`var(--type-subheading)`）判定**，否则按卡片标题（15px，`var(--type-body)`）判定。例：`?page=compose-edit` 的 not-found 卡 `h2 :title` 是该页唯一可见标题 → **17px**；同页 gate 卡 `h2 :gate-title` 是卡片内标题 → **15px**（依据：[UI-009](team/design/UI-009-v3-contrast-and-visual-debt.md) §6.1、[REQ-015](team/requirements/REQ-015-hub-registration-and-compose-edit.md) §3 A2/A3、[UI-010](team/design/UI-010-v3-aii-implementation.md) §6）。

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

**平台受限与降级说明（2026-09-27 立，随当前实现口径）**

* **为什么不能「按记录值切换本地化文案」**：`$t()` 的 key 必须在**编译期**是常量——运行期拼出来的模板串（如 `$t(posts.status-${entry.content.status})`）会被**原样渲染成字面量**，既不查 locale 也不报错（`arc-contracts.md` §28.8，Round 7 探针实测；R8 会重跑探针复核，若与新证据出入以新证据为准）。同批实测还确定两条相邻限制：`visible` 只支持同步 `$session.*` 表达式（§28.1）、`afs-list.emptyText` 的四种写法全部无效（§28.6）。因此在当前平台上，「一行的文案随记录值切换」没有可用机制。
* **降级口径（诚实优先于全本地化）**：一行状态 = **本地化中性标签** + **原始状态值以可见文本呈现** + **色点**。例：草稿区的 `deleted` 写成「草稿 · deleted」，而不是所有状态共用一句「In drafts」；hub 的 `relation` / `direction` / `freshness` 同口径，如 `Freshness: offline`、`Relation: inbound`（本地化标签 + 原始值可见）。
* **三条硬边界**：① **不得**只把真实值放进 `title`（hover 才可见 ≈ 没有双编码）；② **不得**把**不同真实状态**断言成**同一句话**；③ 列表后必须有**常驻 dim 说明**，如实写出降级原因与平台限制（引用 §28.8 / §28.1 / §28.6）。
* **口径修订（只改这一条）**：原「不得出现**裸英文枚举**」修订为「**不得出现『不同真实状态被同一句话断言』；原始枚举值可以可见，但必须有本地化上下文**」。上面第 284 行的要求（**状态点与文字必须同时出现**）**不变**——本次放宽的是「可见文本里能不能出现原始英文枚举」，**不是**「能不能只靠颜色编码」。

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
| 尺寸档 | 默认档 `padding: 8px 16px`、字号 14.4px；`size=sm` 档 `padding: 5px 12px`、字号 13.6px。同屏只允许这两档。**高度不写死**——高度由 `line-height: normal` + 字体度量派生，2026-09-28 实测默认档 **36px（en）/ 38px（zh CJK）**、`size=sm` **29px**；旧的「39px / 31px」是本机旧主题字体下的测量值，已被 UI-007 §3.5 实测推翻，因此判定看两档的 `padding`/字号取值与同屏一致性，**不看某个固定像素**（Lead **D2** 授权改准） |
| 宽度 | **内容宽**，不得被容器拉伸。卡片是 flex 列（`align-items: stretch`），直接放在卡片里的 action 会被拉成整卡宽 → 必须包一层 `row cross=start` |
| 层级 | 每屏一个 `primary`；次级用 `secondary`（accent 淡底）或 `ghost`；破坏性操作 `destructive` |
| 列表行内按钮 | 若行是 `layout=grid itemStyle=card`，行必须 `cross=start`，否则按钮被拉伸到卡片等高（实测 140px） |

> **已知现状 · destructive 按钮文字对比度（Round 11 记 3.99:1 → Round 13 已实施修复，闭环）**：行内 `variant=destructive size=sm` 按钮的文字色由平台规则写成 `--color-error`（`#c53030`；`--color-danger` 只是别名，改写无效），叠在该 variant 自带的 danger 12% 淡化底上（合成 `rgb(235,216,213)`）实测 **3.99:1 < WCAG 2.1 AA 正文 4.5:1**（13.6px 正常字重，无大字豁免）；平台 hover 把底色变成**实心红**并把文字取成 `--color-on-accent`（`#09090b`）→ **3.64:1 ❌**——两态皆破，受影响可见按钮（UI-007 计数）`?page=posts` 34 个（首屏 30）、`?page=hub` 4 个、`?page=factory` 6 个（Round 13 复测 `?page=posts` 为 **38** 个，属列表数据变化、非回归）。这是**平台 variant 的运行时色值 + 页面用法的组合**，不是令牌本身选错——`--color-error` 单独用在页面底 / 卡片底上分别是 **5.23:1 / 4.76:1**（均达标）。Lead **D23**（Round 11）曾裁定记为 R12 设计项；**Round 13 已实施**（Lead **L-R13-1** 批准路径 **A-ii**，UI `task-41`）：`.web/components/theme-bridge/` 的 `CHROME_CSS` 追加 3 条覆写——**静息文字 `var(--color-text)`（实测 12.65:1 ✅）、hover 文字 `var(--color-surface)`（实测 5.47:1 ✅）、非 hover 图标 `var(--color-error)`**；**红改由 1px 描边 + 图标承担**，主题令牌与 `.aup` 零改动，回退 = 删 3 行 CSS。10 个 palette/mode 组合复算：静息 **10/10**、hover **10/10** 均 ≥4.5（最低 6.32 warm/dark、4.53 neutral/dark）。实测原始值、复现命令与已验证断言见 UI-007 §4/V3、[UI-009](team/design/UI-009-v3-contrast-and-visual-debt.md) §3.A-ii、[UI-010](team/design/UI-010-v3-aii-implementation.md) §5。

> **V3 方案指向（Round 12 · UI-009 只提议；Round 13 已按 A-ii 实施，L-R13-1）**：见 [UI-009](team/design/UI-009-v3-contrast-and-visual-debt.md)。本轮实测更正两点事实——① 平台 destructive 规则消费的是 **`--color-error`**（`:root{--color-danger:var(--color-error)}`，改写 `--color-danger` 对按钮**无效**）；② **`.web/themes/*/tokens.json` 不参与控制台**（控制台只加载 Google Fonts + `aup-core.css` + `aup-app.css`）。因此令牌路径必须落在 `--color-error` 上，或改走「文字中性、红由描边 + 图标承担」的用法路径（UI-009 §3/§4）；**本轮已选择后者并落地**（见上一段与 [UI-010](team/design/UI-010-v3-aii-implementation.md)）。

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
* 滚动归属随断点切换：桌面为"页面固定 + 内容区内滚动"（§2.5）；折叠为单栏后恢复页面级整页滚动，禁止单栏内再嵌套滚动区域。
* 列表在窄屏下降级为卡片堆叠，关键操作保持可见。
* 中英文文案长度差异可达 2 倍：按钮与标签不得写死宽度，布局必须容忍文案换行。
* 所有文案走 i18n key（页面作用域），禁止硬编码文案；导航文案集中在 wrapper 命名空间。

---

## 8. AUP 落地约束

设计标准必须在 AUP 现实中可执行（详见 developer-guide.md）：

| 标准 | AUP 落地方式 |
| ---- | ---- |
| 控制台骨架一致 | 侧边栏（含扁平样式与侧栏页脚）由 `scripts/console-nav.mjs` 统一生成并投影进每个控制台页，`--check` 进测试门禁；顶栏由 `.aup/wrapper.aup` 的 `view mode=shell` **一处**承载（控制台与公共页共用，见 §2.1「顶栏」）——`console-topbar` / `console-scroll` 都只是本文档的**概念名**，实现里没有这两个选择器 |
| 全高流式布局 | 页面根 `view style={height: "calc(100vh - 48px)", overflow: visible}`（`overflow` **必须**是 `visible`：`hidden` 会把全出血的顶栏与侧栏裁掉，`arc-contracts.md` §24）；其中 `row style={width: "100vw", marginLeft: "calc(50% - 50vw)", height: "calc(100vh - 48px)", marginBottom: "-52px"}` 承载侧栏 + 内容列，负下边距把侧栏底边压到视口底部且不产生外层滚动（`arc-contracts.md` §21.4）；内容列内 `view size={flex: 1} style={overflowY: auto}` 是唯一滚动容器。`48px` = wrapper 顶栏（`app-header`）的实测高度，平台没有"剩余高度"原语，顶栏高度改了必须复测（`arc-contracts.md` §21.2）。实现里**没有** `console-shell` / `console-pane` / `console-scroll` 这些选择器——它们只是本文档的**概念名**（`grep -rnE 'console-shell\|console-pane\|console-scroll' .aup/` 命中 0） |
| 只用 token | safe-style 白名单：`background` 简写可用，`backgroundImage/backgroundPosition` 会被丢弃—— layered 背景写 `background: <color> url(...) center / cover no-repeat` |
| 权限驱动显隐 | `visible=$session.authenticated`；异步数据用插值形式 `visible="${state.post.x}"`（表达式形式只求值一次） |
| i18n | key 页面作用域 + flat dotted 存储；`arc dsl lint` 防止死 key |
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
□ 布局：宽高 100% 流式；页面固定无纵向滚动条，滚动只发生在 console-pane（本文档的概念名，实现里没有这个选择器）内（无双滚动条）；节数 ≥ 18 时允许侧栏自身滚动（§2.5），但**页脚（品牌/关于/RSS/版权）必须能通过该滚动到达**——判据：侧栏滚动到底后页脚最后一行底边进入视口（不要求首屏可见，Lead D24）
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
  右侧内容里不存在会把控制台整页替换掉的链接（断言见本节末，期望 0）
□ 对比度：`[data-variant="destructive"]` 静息与 `:hover` 的文字/底对比度均 ≥4.5:1（WCAG 2.1 AA，无大字豁免）
□ 命中区：可点击控件的命中区 ≥24×24（WCAG 2.5.8）；`data-kind=back` 的平台配方（`padding:0;min-height:0`）必须被页面内联 `padding` 覆盖（断言见本节末）
```

末条的可执行断言（**执行前提：admin 会话、视口 1803×908**；在任一控制台页面执行，例如 `?page=posts`、`?page=tags`；生成器已 id-less，因此按"内容区滚动容器"定位——`arc-contracts.md` §25.3）：

```js
// 内容区滚动容器内的无 target 链接数 —— 期望 0（原断言；对视口敏感，判定见下面的等价断言）
[...document.querySelectorAll('*')]
  .filter(el => el.scrollHeight > el.clientHeight + 2
    && /auto|scroll/.test(getComputedStyle(el).overflowY)
    && !el.querySelector('.aup-app-header'))   // 排除承载框架顶栏的页面级滚动容器
  .pop()?.querySelectorAll('a:not([target])').length ?? 0
```

> **原断言对视口敏感（BUG-011）**：`.pop()` 取最后一个候选容器，候选集合随视口变化——BUG-010 修复前，1803×908 下 `?page=compose` 的候选集合为空、`?? 0` 兜底给出 `0`（空心通过），1512×765 下同一个页面 `.pop()` 取到侧栏容器（含页脚「关于」链接）→ 给 `1`；BUG-010 修复后（2026-09-28 00:3x）`?page=compose` 两视口都回到 `0`，但同一缺陷在 **`?page=appearance`** 上重演（1803×908 → `0`、1512×765 → `1`）——说明是**原断言自身**的问题，不是某一页的偶发。所以**判定以下面的等价断言为准**；原断言只在 1803×908 下可作参照。成因、两轮两视口原始 JSON 与完整的等价断言口径见 §2.6（本清单不重复）。

**等价断言（判定以此为准）——只针对内容列：`candidates` 必须 ≥ 1，`total` 必须为 `0`**（排除框架顶栏 `.aup-app-header`、排除含侧栏当前项 `[data-active="true"]` 的容器、排除 UA 默认 `overflowY: auto` 的表单控件；理由与逐条实测见 §2.6）：

```js
// 只针对内容列的等价断言 —— 期望 total 0，且 candidates >= 1
(() => {
  const header = document.querySelector('.aup-app-header');
  const activeNav = document.querySelector('[data-active="true"]');
  const isFormControl = el => /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName);
  const contentColumns = [...document.querySelectorAll('*')].filter(el =>
    /auto|scroll/.test(getComputedStyle(el).overflowY) && !isFormControl(el) &&
    !(header && el.contains(header)) &&
    !(activeNav && el.contains(activeNav)));
  return {
    candidates: contentColumns.length,        // 必须 >= 1，否则不算通过
    linksPerColumn: contentColumns.map(el => el.querySelectorAll('a:not([target])').length),
    total: contentColumns.reduce((n, el) => n + el.querySelectorAll('a:not([target])').length, 0), // 期望 0
  };
})()
```

原断言实测（2026-09-27，admin 会话，视口 1803×908）：17/17 控制台页均为 `0`。**更正（2026-09-28，BUG-010 修复后复跑，见 [UI-005](team/design/UI-005-bug014-measurement-note.md)）**：原文把去掉 `!el.querySelector('.aup-app-header')` 后 `?page=compose` 的计数写作非零（BUG-010 之前的旧测量为 `2`，命中框架 chrome 两条链接），那是 BUG-010 之前的旧测量；修复后同一探针在 1803×908 与 1512×765 复跑，**去掉过滤后 `?page=compose` 均为 `0`**（`.pop()` 已直接命中内容列，该过滤项在 compose 上不产生差异），漂移改在 `?page=appearance` 上重现（1512×765 带 / 不带过滤均为 `1`，`.pop()` 命中侧栏容器）。命中项都不属于右侧内容区，**期望值仍为 `0`，判定以等价断言为准**（成因与两视口原始 JSON 见 §2.6）。

等价断言实测（**UI 自跑**，admin 会话，两视口原始 JSON 见 [UI-004](team/design/UI-004-ui-standard-assertion-and-residuals.md) §2）：**BUG-010 修复后**（2026-09-28 00:3x）`?page=compose` / `?page=appearance` / `?page=posts` / `?page=tags` / `?page=dashboard` 在 1803×908 与 1512×765 下**全部**为 `candidates: 1, total: 0`；**BUG-010 修复前**（2026-09-28 00:2x）`?page=compose` 两视口均为 `candidates: 0`（该页当时没有内容列滚动容器，属 [BUG-010](team/bugs/BUG-010-compose-appearance-missing-content-scroll-container.md) 的实现缺口，断言此时**不通过**，而非旧的空心放行）。全部控制台页的复跑由 QA-004（`task-14`）在同一 admin 会话内执行。

**对比度断言（Round 13 · V3 A-ii 实施后新增；执行前提同上：admin 会话、1803×908）**——静息态用下面这段**只读**页面断言（本片段已在实例上跑通，原始输出见 [UI-010](team/design/UI-010-v3-aii-implementation.md) §5.3：`restRatio 12.64 / backdrop rgb(235, 216, 213) / pass true`）：

```js
// [data-variant="destructive"] 静息：文字 vs 12% 淡底合成到实测 --card-bg —— 期望 >= 4.5 且 pass === true
(() => {
  const nums = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const rgb255 = (s) => {              // 'rgb(r, g, b)' 0-255 或 'color(srgb r g b / a)' 0-1，也接受 hex
    if (s.trim().startsWith('color(')) { const v = nums(s); return v.slice(0, 3).map((x) => Math.round(x * 255)); }
    if (s.trim().startsWith('#')) { const h = s.trim().slice(1); const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
      return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)); }
    return nums(s).slice(0, 3);
  };
  const alpha = (s) => { const v = nums(s); return v.length > 3 ? v[3] : 1; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
  const root = getComputedStyle(document.documentElement);
  const card = rgb255(root.getPropertyValue('--card-bg'));
  const cs = getComputedStyle(document.querySelector('[data-variant="destructive"]'));
  const a = alpha(cs.backgroundColor);
  const backdrop = rgb255(cs.backgroundColor).map((v, i) => Math.round(v * a + card[i] * (1 - a)));
  const css = (document.getElementById('arcblog-chrome-style') || {}).textContent || '';
  return {
    restRatio: ratio(rgb255(cs.color), backdrop),      // 期望 >= 4.5（Round 13 实测 12.64）
    restText: cs.color,                                // 期望 'rgb(26, 26, 31)'（natural/light 的 --color-text）
    backdrop: 'rgb(' + backdrop.join(', ') + ')',       // 实测 'rgb(235, 216, 213)'
    textIsTextToken: rgb255(cs.color).join() === rgb255(root.getPropertyValue('--color-text')).join(),
    hoverRuleInjected: css.includes('[data-variant="destructive"]:hover{color:var(--color-surface)}'),
    pass: ratio(rgb255(cs.color), backdrop) >= 4.5 && css.includes(':hover{color:var(--color-surface)}'),
  };
})()
```

**hover 态**无法用页面内 JS 触发（`:hover` 不是可编程状态），按下述 CDP 配方判定（**覆盖色实验后必须等 ≥800ms** 再读 computed，平台 `transitionDuration = 0.15s`；Round 13 原始取值见 [UI-010](team/design/UI-010-v3-aii-implementation.md) §5.2：`color rgb(255, 255, 255)` / `bg rgb(197, 48, 48)` / 图标非红 / 比值 **5.47**）：

```text
# 同一 tab 内（单标签页纪律）：
DOM.getDocument → DOM.querySelector('[data-variant="destructive"]') → nodeId
CSS.forcePseudoState({ nodeId, forcedPseudoClasses: ["hover"] })   # 等 >=800ms
Runtime.evaluate → getComputedStyle(btn).color / backgroundColor    # 期望 白字 on 实心红
CSS.forcePseudoState({ nodeId, forcedPseudoClasses: [] })           # 复原
```

**命中区断言（WCAG 2.5.8 · Round 13 由 REQ-015 探针定为「`padding` 被 `action` 转发」= 态①）**：`?page=compose-edit` 的 `Back to studio`（`variant=ghost` + `data-kind=back`）页面内联 `padding: 5px 12px` 已覆盖平台 `padding:0;min-height:0` 配方，**实测 `rect 139×29`**（Round 13，1803×908，[UI-010](team/design/UI-010-v3-aii-implementation.md) §5.4），因此写为**硬断言**：

```js
// ?page=compose-edit：返回按钮命中区 —— 期望 h >= 24 && w >= 24（实测 139x29）
(() => { const a = [...document.querySelectorAll('button,a')].find((x) => /Back to studio/i.test(x.innerText || ''));
  if (!a) return { notFound: true };
  const r = a.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), pass: r.width >= 24 && r.height >= 24 }; })()
```

> 注：该按钮的 `font-size: 13px` 仍落在 §4.3 两档（14.4 / 13.6px）之外（平台 `data-kind=back` 配方），Round 13 未改（REQ-015 明令「不得为它单独引入 hack」，且此项不进验收硬门）。

---

## 10. 一句话总结

> 优雅的 ArcBlog 后台：运营者永远知道**现在是什么状态、下一步做什么、点下去会发生什么**——不多不少。

---

## 附录 A：布局参考范本（给 AI 实现时的参照）

§2.3 结构 + §2.5 滚动是标准，本附录是**喂给 AI 的原材料**。给 AI 的正确姿势是「一份骨架 + 一个真实案例 + 本页验收标准」，而不是一串仓库链接——给多了它会跨框架混搭。

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

> 本节的参考 CSS 类名（`.app-shell` / `.console-nav` / `.console-pane` / `.page-head`）与上面这段的 `row console-shell` ≈ `.app-shell`、`view console-pane` ≈ `.console-pane` **都是本文档的概念名，不是仓库里的选择器**（`grep -rnE 'console-pane|console-shell' .aup/ scripts/` 命中 0）：`.app-shell` / `.console-pane` 是**与框架无关的 CSS 骨架**类名（本节是喂给 AI 的原材料，不描述本仓库实现），`row console-shell` / `view console-pane` 表达的是**结构类比、非仓库选择器**，AUP 落地对应的是结构而不是这段 CSS（§8）；A.3 自检条目里的 `console-pane` 同此口径。

**AI 最常犯的三个错**（评审时优先查这三条）：

1. **漏 `min-height: 0`**——grid/flex 子项默认 `min-height: auto`，会被内容撑高，于是「内容区滚不动，整页反而出现滚动条」，正好是 §2.5 禁止的双滚动条。
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
标准：docs/ArcBlog-admin-ui-design.md §2.3 结构 + §2.5 滚动 + 附录 A.1。
参照：附录 A.1 的 CSS 骨架，加附录 A.2 中一个案例的 DOM 结构。
交付后自检：① 页面无纵向滚动条 ② 无横向滚动 ③ 滚动只发生在 console-pane（本文档的概念名，实现里没有这个选择器）
          ④ 滚动时页头与侧边栏静止 ⑤ 无固定像素页宽 ⑥ 宽高均 100% 流式。
```
