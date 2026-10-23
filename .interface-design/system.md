# ArcBlog 控制台 — 设计系统（`.interface-design/system.md`）

> 由 `interface-design` skill（`Dammyjay93/interface-design`）的「After completing a task → save」流程生成。
> **规范效力的唯一出处仍是 [`docs/04-UI设计规范/`](../docs/04-UI设计规范/00-总则与形态纪律.md)**；本文件只记**决策与实测值**，
> 与 docs/04 冲突时以 docs/04 为准（本文件不新增可验收条款）。

## 1. 方向与手感

**一句话**：这是一间**刊物编辑室的工作台**，不是 SaaS 仪表盘。纸（画布）＋墨（字）＋细线（规则），
颜色只用来传话。

- **谁**：一个人守着一台 ArcBlog 节点的运营者。打开控制台前 5 分钟大概在终端里跑过一条 CLI；
  之后要做的决定是「先处理哪件事」，不是「看什么图」。
- **必须完成**：判断下一步动作（写稿 / 清异常 / 上线页面 / 看节点身份）。
- **手感**：安静、精确、密度偏高；像期刊的扉页与账本的规则线，不像卡片拼贴。

## 2. 硬约束（设计不得越过）

| 约束 | 事实 | 后果 |
| --- | --- | --- |
| 介质 | AUP DSL（14 个控制台页），无打包器、无前端依赖、无组件库/图标库/图表库 | 只能用 AUP 原语 + 内联 style |
| 样式键 | safe-style 白名单 **67 键**（实测自 `/aup.<hash>.js` 的 `var Qw={…}`）；`letterSpacing/fontWeight/fontSize/lineHeight/textTransform/borderTop/Left/…` **在**，`transition/transform/fontVariantNumeric/wordBreak/overflowWrap` **不在** | 悬停/焦点/tabular-nums 只能走桥注入的 CSS 层 |
| 颜色 | 平台主题（`docs/04 §05 V09`）：桥把平台的 18 个 token + 4 个别名写到宿主 `<html>` | 仓库不新造调色板；「60/30/10」里的 10 只能是 `--color-accent`（本 tone 下 = 墨色）与 `--color-warning` |
| 结构 | `docs/03` 已冻结的页面族 + `docs/04 §01` L1–L9（每页 ≤2 卡、页头恰 1 主操作、界面不承载开发说明） | 重构只能在页面族内部做 |
| 棘轮 | `ui-budget`（cards/styles/i18n…）、`ui-copy`（L8）、`console-nav`（侧栏生成物） | 任何"更好看"都要付得起这些门 |
| 复核 | 登录态内容门 + 三档截图与 DOM 检查（2026-10-23，见 §8） | 本机受控登录态可验证 UI；不把 UI 自验升级为功能台账的独立验收 |

## 3. 分寸（本次决策值）

| 项 | 决策 | 为什么 |
| --- | --- | --- |
| 深度策略 | **只用细线**（borders-only，`1px var(--color-border)`）+ **唯一一处**表面色（异常区 `var(--card-bg)`） | 这个 tone 的调色板本身就是纸墨；卡片投影会把纸面割成"卡片世界" |
| 半径 | 卡片 10（`--radius-lg`）仅用于异常区；控件 8（`--radius-md`）；小控件 4（`--radius-sm`）；**不用第三个值** | `docs/04 V02` 只允许三个合法值 |
| 间距基元 | 4px 网格；**行内 xs(≈6) · 卡内 sm(≈12) · 分节 18 · 页头 16+1px 线 · 页脚 18** | 呼吸不均匀：密的地方密，松的地方松 |
| 字号 | 一律取运行时阶梯：`--type-heading` 21.6（页标题）/ `--type-subheading` 17（分节）/ `--type-body` 15（正文）/ `--type-caption` 13 / `--type-small` 12（元信息）/ `--type-display` 32（数字带） | 页面不新造字号（V01 的同族纪律：不写死设计值） |
| 层级杠杆 | 大小 **+** 重量 **+** 颜色 三件一起用；标题 600，正文 400，元信息 `intent=muted` | 只靠字号会做出"15/16/17 糊" |
| 焦点 | 每页一个：概览页 = **异常区**（唯一上色、唯一卡片）；数字带是背景音，不是主角 | 四张同构卡 = 没有焦点 |
| 颜色语义 | `--color-warning` 只出现在异常区（2px 左竖线 + 级别字）；`--color-accent` 只出现在主操作与侧栏当前行 | 颜色是稀缺资源 |
| 动效 | 无（内联 style 表达不了，且运营面按 100+ 次/天用） | 不给自己造 FOUC |

## 4. 组件配方（用了几次就记下来）

| 组件 | 尺寸/写法 | 出处 |
| --- | --- | --- |
| 刊头（masthead） | `view` `padding: 4px 0 16px` + `borderBottom: 1px solid var(--color-border)`；`row cross=end` 左标题右主操作 | `?page=dashboard` |
| 页标题 | `h2 level=2` + `fontSize: var(--type-heading)` `fontWeight: 600` `letterSpacing: -0.012em` `lineHeight: 1.15` | 同上 |
| 主操作 | `action variant=primary` + `borderRadius: var(--radius-md, 8px)` `padding: 9px 14px` `fontSize: var(--type-caption)` | 同上（平台在 editorial 下把 action 抹成药丸，必须内联改回） |
| 数字带（KPI） | 上沿 1px 线 + `paddingTop: 14px`；四列 `size={flex: "1 1 0%"}` `gap=lg`；数字用 `--type-display` + 600（不使用渐变 `scale=display`），标签 `var(--type-small)` + `letterSpacing: 0.07em` + `textTransform: uppercase` + `var(--color-dim)` | 同上 |
| 分节 | `view` `borderTop: 1px solid var(--color-border)` `marginTop: 18px` `paddingTop: 18px`；`h3 level=3` + `scale=sm intent=muted` 说明 | 同上 |
| 告警面 | `background: var(--card-bg)` `border: var(--card-border)` + `borderLeft: 2px solid var(--color-warning)` + `borderRadius: 0 8 8 0`；列头一次「级别」，行内不再重复 | 同上 |
| 行 | `row cross=center`；标题默认字号，元信息 `scale=sm intent=muted` 或 `intent=muted` | 同上 |

## 5. 一致性检查（改 UI 前先过）

1. 这一段用的是**细线**还是**表面色**？除异常区外不出现 `var(--card-bg)`。
2. 字号是否来自 `--type-*`？出现 `1.75rem`/`15px` 这类字面量就是跑偏。
3. 是否新加了颜色？只允许 `--color-border` / `--color-dim` / `--color-text` / `--color-warning` / `--color-accent`。
4. 一个屏里有几个焦点？两个以上就是没决定。
5. `node scripts/arcblog-ui-budget.mjs`（棘轮）与 `npm test` 是否仍绿；`styles` 涨了就要在案。

## 6. 列表项配方（宽屏陷阱，2026-10-20 实测）

**现象**：`afs-list` 的 `role=item` 在宽屏下把 item 的**每个直接子节点**摊成一列 ⇒ 名称漂到中间、左侧大片空白、破坏性按钮抢占行首（`?page=categories` 1848px 实测）。

**规矩**：`role=item` 的 `view` 里**只允许一个子节点**（一个包裹 `view`），内容在这个包裹里按列排：

```
view gap=xs role=item {           // 唯一子节点 ↓
  view gap=xs size={flex: 1} {
    …标题 / 元信息 / 描述…
  }
}
```

**禁止**：在 `role=item` 上靠 `display`/`flexDirection` 覆盖（运行时写法会盖掉页内内联样式，实测无效）。

**固定尺寸元素在行内**：用 `size={width: "hug"}`（= `width:fit-content; flex:none!important`），不要用 `flexShrink`/`alignSelf`（`action` 上会被静默丢弃，按钮会被拉到整行宽）。

**演示**：`?page=dashboard`（页头主操作、刷新、查看全部都靠这条对齐到右缘）。

**实测（2026-10-20，`--eval` 量的 DOM，不是猜的）**：`role=item` 渲染成 `class="aup-view aup-list-row"`，`display:flex` + **`align-items:center`**；它的子节点默认 `flex: 0 1 auto` → **fit-content 并水平居中**（KPI 行实测 244px / 容器 1227px）。所以：

> 列表项里的内容块想要撑满，必须给它 **`size={width: fill}`**（= `width:100%`），而不是给 item 加 `width`。

修好后同一测量：`item 1227 / row 1227`。

## 7. 桥注入的 CSS 层（2026-10-20 落地，实测）

**为什么在桥里**：内联 `style={}` 表达不了媒体查询，而 `docs/04 §2.7.2` 给每页只有 **8 个** `style={}`
槽位；`14 页共用的字阶与响应式` 不该按页复制。所以字阶 + 响应式只有一处：
`.web/components/theme-bridge/script.js` 的 `CHROME_CSS`（生成到 `render.js`，由
`node scripts/arcblog-theme-bridge.mjs` 重生成）。

**作用域 = 生成的侧栏**：`:has(.aup-view[style*="clamp(200px"])`。公开页没有这个元素，因此
整层碰不到 `/`、`/about`、`/posts/<slug>`。宽度字面量的唯一出处是 `scripts/console-nav.mjs`；
改成别的值会让整层**静默失效**，所以 `scripts/arcblog-theme.test.mjs` 把两者钉在一起。

| 层 | 规则（摘要） | 谁受益 |
| --- | --- | --- |
| 字阶 | 控制台 `h2.aup-text` = `--type-heading` / 600 / `-0.012em` / 1.15；`h3.aup-text` = `--type-subheading` / 600 | 14 页刊头与分节标题**同一把尺**；页内内联样式仍优先（门禁卡的 `--type-body` 小标题保留） |
| 响应式 ≤860 | 壳行转列、侧栏变**横向可滚条**（平台自己的 settings 侧栏在 ≤768 用同一形状）、内容列吃满宽度并保留 16px 边距 | 「三档宽度可看可点」：375 宽下不再出现"侧栏 200 + 内容 113、标题逐字换行" |
| 列表行 ≤860 | `[data-layout=row]` 换行；带 `[data-width=hug]` 操作组的行 → 文字独占一行、操作组落到下一行右对齐 | `?page=posts` 375 实测：标题列改前被压到 63px（`t/e/c/h/…` 一列一个字） |
| 空态 ≤860 | `.aup-list-empty` 的 32px 内边距 / 80px 最小高 → 16px / 64px | 手机上不再为"没有记录"占掉半屏 |

**实测口径**：15 个控制台页 × 1516 / 768 / 375，`scrollWidth - clientWidth` 全部 **0**；
侧栏 1516 时 227（15vw）、≤860 时 = 视口宽；内容列与视口同宽。

**给后续页面的用法**：页面只写结构（刊头、分节线、行内左右两段），**字号/字距/行高不再内联**；
`h3` 也不再内联 `fontSize: var(--type-body)`——那会把分节标题压回正文大小，与本层的统一字号打架。

## 8. 统一落地实测（2026-10-23）

剩余 12 页已统一刊头与分节，验证覆盖 15 页 × 1516/768/375，45 个组合无横向越界；有记录编辑路由另测三档刷新后状态（12 字段齐全）。
登录面保留概览异常卡；编辑页另有门禁卡。内容区卡计数 22→2，style 220→144，i18n 483→464；严格超预算页 9→8，棘轮零回归。
窄屏固定 grid 改单列，刊头说明先占满一行再放操作组；列表标题用正文阶，分节标题用副标题阶。
行为验证同时守住最近表单祖先与隐藏字段的作用域；节点 NFT 高级区必须有事件引用的 `factory-advanced` 实体目标。
冷启动编辑器仍按 B14 提示刷新一次；截图验证可用 probe 的 `--reload` 显式覆盖刷新后状态，不将它混称为冷启动。
完整结果与可归档条款候选见 [本轮验收记录](../docs/team/ui-升级验收-2026-10-23.md)。本文件不新增冻结规范条款。
