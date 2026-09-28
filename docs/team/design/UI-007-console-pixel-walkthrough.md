# UI-007：控制台 17 页像素级视觉走查（computed style / 对比度 / 复现脚本）

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-007 |
| 状态 | 走查完成：**8 条 P2 + 1 条 P3 实现偏差**（V1–V9）待 PM 派活；另 5 条文档缺口（D1–D5）待 Lead 裁定；1 处标准事实错误已按 L-R11-2 授权修正 |
| 提出轮次 | round-11（`task-27`，Lead 裁定 **L-R11-2** 授权：UI 可做像素级视觉走查，可改 `docs/team/design/**` 与 `docs/ArcBlog-admin-ui-design.md` 的**事实错误**） |
| 上游依据 | [`docs/ArcBlog-admin-ui-design.md`](../ArcBlog-admin-ui-design.md) §2.1 / §2.4 / §2.5 / §3.1 / §3.2 / §3.3 / §3.4 / §4.1 / §4.3 / §4.4 / §7 / §9 · [`docs/arc-contracts.md`](../arc-contracts.md) §21.4–§21.7 / §23 / §24 / §25.3 · [`UI-001`](UI-001-console-tokens-and-walkthrough.md)（上一轮方法）· REQ-002 §3 A6 / D4 裁定（gate 卡豁免） |
| 实现方 | **UI 已改（仅文档事实）**：`docs/ArcBlog-admin-ui-design.md` §2.1 两行（选中菜单项 / 当前菜单项）· **需 Dev**：V1–V9（全部在 `.aup/**`，UI 无写范围） |
| 原始输出 | [`raw/UI-007-admin.json`](raw/UI-007-admin.json)（17 页 admin，376 KB）· [`raw/UI-007-guest.json`](raw/UI-007-guest.json)（17 页无 cookie 访客，95 KB） |

---

## 0. 范围、方法与快照

### 0.1 范围

- **页面**：本轮 `task-27` 指定的 **17 页**（不含 Dev 本轮正在新建的 `settings-general`）：
  `dashboard, posts, pages, compose, heroes, categories, tags, seo, feeds, appearance, operations, hub, media, agents, policy, access, factory`。
- **快照当场的事实（重要）**：`scripts/console-nav.mjs` 在 **2026-09-28 09:01:21（本地）** 被 Dev 修改，`CONSOLE_SECTIONS.length` 已从 **17 变 18**（新增 `settings-general`，界面词 `通用 / General`）：

  ```bash
  $ node -e "import('./scripts/console-nav.mjs').then(m=>console.log('groups='+m.CONSOLE_MENU.length,'sections='+m.CONSOLE_SECTIONS.length, JSON.stringify(m.CONSOLE_SECTIONS)))"
  groups=5 sections=18 ["dashboard","posts","pages","compose","heroes","categories","tags","seo","feeds","appearance","operations","hub","media","agents","policy","access","factory","settings-general"]
  ```

  因此本报告的**内容测量仍是这 17 页**（Dev 的 `?page=settings-general` 不在范围内），但**侧栏几何（§1.2 的侧栏行 + V8）是在 18 节模型下测的**，并据此发现 V8（侧栏一屏放不下）。

### 0.2 方法（只读，不点击任何写操作）

1. **运行期测量**：共享调试 Chrome `:9333`（profile `/tmp/arcblog-chrome-test`）——CDP `Page.navigate` + `Runtime.evaluate`，视口固定 **1803×908**（D 缩放 1），每页 `navigate` 后等 **3.4 s**（列表 / `propBind` 落定）再取 computed style。
2. **两个会话（顺带覆盖 en/zh）**：
   - **admin 会话**（共享 Chrome 现有登录态）实测渲染 **`lang=en`** → 17 页英文文案的几何基线；
   - **无 cookie 访客**：CDP `Target.createBrowserContext()` + `Target.createTarget()` 造隔离上下文，实测渲染 **`lang=zh`** → 17 页登录门（gate）的几何基线。
3. **未做的事**（如实标注）：没有点击任何写操作（Publish / Delete / 入队都不点）；没有做深色模式；没有在**同一页**上做逐页 en/zh 几何对照（`?locale=` 见 §3.6 的限制）。
4. **原始输出落盘**（可复查）：`docs/team/design/raw/UI-007-admin.json`、`raw/UI-007-guest.json`。
5. **并发写实例的污染与剔除**（诚实记录）：
   - Dev 在 **08:43:03–09:01:06** 持有 `docs/team/.gate-lock`（内容：`dev (task-26 settings General) … instance probe writes: config/general records + temp probe page`），期间 `.aup/app.json` 于 **08:44:07 / 08:52:55** 被改写；
   - 该窗口内 3 次观测到 `?page=<name>` 加载被**静默归一化到首页**（guest `operations`——该遍扫描于 08:41:12 结束、admin `factory` 约 08:47、admin `categories` 约 09:01:4x；最后一次与 `scripts/console-nav.mjs` 的 09:01:21 改动同窗）。**污染窗口内的数据已全部丢弃**；
   - 锁释放后先跑**专项复现**（3 轮 × 17 页 = **51 次**直达加载，09:02:22–09:04:36）→ `fallbacks 0`；随后重跑两遍 17 页扫描 → 均 `0` 回落。本报告的表格全部取自 09:04:4x–09:07 的**干净两遍**（admin `raw/UI-007-admin.json` mtime 09:05:57、guest 09:07）。
   - 归一化回落本身记为**待观察项**（§7.3），不作为缺陷定性。
6. **快照**：`git HEAD = 17aac1f`；工作区 65 项未提交改动（Dev 的本轮产物在场，`.aup/pages/**` 多处 `M`）；本轮测量的源码行号以 **2026-09-28 09:1x** 工作区为准。

### 0.3 术语

| 记号 | 含义 |
| ---- | ---- |
| **期望值** | `docs/ArcBlog-admin-ui-design.md` 与 `arc-contracts.md` 里写下的取值（不改） |
| **实测值** | 上面的 CDP 表达式在当前实例上的 `getComputedStyle` 结果 |
| **真偏差** | 实现与标准不符，且**归 ArcBlog 侧**（可提 Dev 改） |
| **平台差异** | 由平台组件/运行期样式产生，控制台内联样式改不动（写明理由，不要求 Dev 修） |

---

## 1. 设计令牌：期望值 vs 实测值

### 1.1 令牌本身（`getComputedStyle(document.documentElement)`，17 页逐页取，**全部一致**）

主题：`tone=editorial`、`palette=natural`、`mode=light`（17 页 + 两个会话一致）。

| token | 实测值 | token | 实测值 |
| --- | --- | --- | --- |
| `--color-bg` | `#fafaf8` | `--radius-sm` | `4px` |
| `--color-surface` | `#ffffff` | `--radius-md` | `8px` |
| `--color-text` | `#1a1a1f` | `--radius-lg` | `10px` |
| `--color-dim` | `#6b6b78` | `--type-display` | `2rem`（32px） |
| `--color-border` | `rgba(0,0,0,.08)` | `--type-heading` | `1.35rem`（21.6px） |
| `--color-accent` | `#2a6e00` | `--type-subheading` | `1.0625rem`（17px） |
| `--color-accent-bg` | `rgba(42,110,0,.08)` | `--type-body` | `.9375rem`（15px） |
| `--color-success` | `#0f766e` | `--type-small` | `.75rem`（12px） |
| `--color-warning` | `#a16207` | `--type-caption` | `.8125rem`（13px） |
| `--color-danger` | `#c53030` | `--space-block` | `1.25rem`（20px） |
| `--color-info` | `#2563eb` | `--aup-content-max` | `1200px` |
| `--card-bg` | `#f0efec` | `--card-border` | `1px solid rgba(0,0,0,.08)` |

> 复现：`raw/UI-007-admin.json` 每条的 `tokens` 字段；`node -e "const a=require('./docs/team/design/raw/UI-007-admin.json');console.log(a.every(p=>JSON.stringify(p.tokens)===JSON.stringify(a[0].tokens)))"` → `true`。

### 1.2 逐页几何（admin 会话，1803×908，17 页）

> 说明：`内容列 gap` = 内容区滚动容器（唯一滚动条）的 `row-gap`；`page-title` = 页面第一个可见 `h2`；`卡片标题/区块标题` = 该页除页面标题外的可见标题字号集合（**未按 DOM 归属细分**，逐条定性见 §2/§3）。

| 页面 | 卡片数 | 卡片 padding | 卡片 rowGap | 卡片圆角 | 卡片 boxShadow | 内容列 gap | 页面标题 | 其余标题字号 | primary | sm | 按钮圆角 | 按钮高 | 按钮字号 |
| --- | --: | --- | --- | --- | --- | --- | --- | --- | --: | --: | --- | --- | --- |
| `?page=dashboard` | 6 | 14px | 10px | 10px | none | 10px | Dashboard 17px | 17px · 15px | 1 | 0 | 3px · 8px | 18 · 36 | 11.52px · 14.4px |
| `?page=posts` | 3 | 14px | 10px | 10px | none | 10px | Your studio 17px | 15px | 1 | 73 | 8px | 36 · 29 | 14.4px · 13.6px |
| `?page=pages` | 1 | 14px | 10px | 10px | none | 10px | Pages 17px | 15px | 1 | 2 | 8px | 36 · 29 | 14.4px · 13.6px |
| `?page=compose` | 5 | 14px | 10px | 10px | none | **20px** | Write a post 17px | 17px | 1 | 0 | **32px** | 36 | 14.4px |
| `?page=heroes` | 5 | 14px | 10px | 10px | none | 10px | Hero management 17px | 15px | 1 | 3 | 8px | 29 · 36 | 13.6px · 14.4px |
| `?page=categories` | 2 | 14px | 10px | 10px | none | 10px | Categories 17px | 17px | 1 | 3 | 8px | 29 · 36 | 13.6px · 14.4px |
| `?page=tags` | 4 | 14px | 10px | 10px | none | 10px | Tags 17px | 15px | 1 | 2 | 8px | 29 · 36 | 13.6px · 14.4px |
| `?page=seo` | 1 | 14px | 10px | 10px | none | 10px | SEO 17px | 15px | 1 | 0 | 8px | 36 | 14.4px |
| `?page=feeds` | 1 | 14px | 10px | 10px | none | 10px | Feeds 17px | — | 0 | 0 | — | — | — |
| `?page=appearance` | 1 | **0px** | **0px** | 10px | **`0 1px 2px rgba(26,26,31,.08)`** | **20px** | **Appearance 21.6px** | 15px | 0 | 0 | — | — | — |
| `?page=operations` | 4 | 14px | 10px | 10px | none | 10px | Operations 17px | — | 0 | 0 | 3px | 18 | 11.52px |
| `?page=hub` | 3 | 14px | 10px | 10px | none | 10px | Hub console 17px | 15px | 0 | 12 | 3px · 8px | 18 · 29 | 11.52px · 13.6px |
| `?page=media` | 6 | 14px | 10px | 10px | none | 10px | Media 17px | 15px | 0 | 0 | — | — | — |
| `?page=agents` | 5 | 14px | 10px | 10px | none | 10px | Agent capabilities & tools 17px | 17px · 15px | 0 | 0 | 3px | 18 | 11.52px |
| `?page=policy` | 3 | 14px | 10px | 10px | none | 10px | Split policy 17px | — | 0 | 0 | — | — | — |
| `?page=access` | 2 | 14px | 10px | 10px | none | 10px | Access grants 17px | — | 0 | 0 | — | — | — |
| `?page=factory` | 4 | 14px | 10px | 10px | none | **20px** | **Node NFT 21.6px** | 15px | 1 | 6 | 3px · 8px | 18 · 36 · 29 | 11.52px · 14.4px · 13.6px |

**一致的部分（做对，不要动）**

| 项 | 期望（标准） | 实测 | 结论 |
| --- | --- | --- | --- |
| 内容卡 padding | §3.3 卡片样式 `14px` | 16/17 页的卡片 padding 全为 `14px`；仅 `appearance` 的容器是平台 `auto-surface` 外壳（0px，内层平台 20px，见 §3.1） | ✅（appearance 属平台差异） |
| 内容卡 rowGap | §3.3 `gap=sm` = 10px | 17/17 页 `10px` | ✅ |
| 内容卡圆角 / 阴影 / 描边 / 底色 | §3.3 `var(--radius-lg)`(10px) + `boxShadow: none` + `1px var(--color-border)` + `var(--card-bg)` | 16/17 页 = `10px / none / 1px rgba(0,0,0,.08) / rgb(240,239,236)` | ✅ |
| 页面标题字号 | §3.4 `var(--type-subheading)` = 17px | **15/17 页 17px**（`appearance`、`factory` 为 21.6px → V7/§3.1） | 🟡 两页偏差 |
| 内容列上下内边距 | §3.3「控制台精修取值…`console-pane`（**概念名**，实现里没有该选择器）上下 `padding: 14px`」 | 17/17 页外层 `padding: 14px 0px` | ✅ |
| `primary` 每屏数量 | §4.3「每页最多 1 个 / 每屏一个」 | 17/17 页 `≤ 1`（posts 已从 UI-001 时的 **30** 降为 **1**） | ✅（F2 已修） |
| 按钮圆角 | §4.3「全部 `var(--radius-md, 8px)`」 | **有 action 的页面全部 8px**（另有一类平台 `18×18` 按钮是 `3px`，见 §3.2）；唯一例外 `compose` 两个按钮 `32px` → V6 | 🟡 一页偏差 |
| 按钮尺寸档 | §4.3 只允许默认档与 `size=sm` 两档 | 每页只用这两档；默认 `padding: 8px 16px`、`size=sm` `padding: 5px 12px` 与标准一致 | ✅（高度稳定性见 §7.4 D2） |
| 无双滚动条 | §2.5 | 17/17 页 `documentElement.scrollHeight === clientHeight`（908/908）；每页**恰好 1 个**内容列滚动容器 | ✅ |
| 横向不滚动 | §7 | 17/17 页 `documentElement.scrollWidth === clientWidth`（1803/1803） | ✅（逐元素 `scrollWidth>clientWidth` 的 2 处是预期的 100vw 逃离，见 §3.3） |
| 当前菜单行 | §2.3 + `arc-contracts.md` §23（`active=true` → accent token） | 18 节模型下每页**恰好 1 行** `data-active="true"` + `aria-current="page"`，`bg rgba(42,110,0,.08)` / `color rgb(42,110,0)`；行宽 269.44px（`clamp(200px,15vw,280px)`=270.44 减 1px 分隔线） | ✅ |
| 侧栏页脚 | §2.1 | 品牌 / 关于 / RSS / 版权四行已渲染（UI-001 F9 已落地） | ✅（但见 V8：落到折叠线下） |

---

## 2. 真偏差（实现问题，可提 Dev）

> 每条给：现象 → 期望（引用） → 实测 + 偏差量化 → 复现命令+真实输出 → 建议修复 + 优先级 → 根因（文件:行）。
> 行号为 **2026-09-28 09:1x 工作区**快照；`HEAD=17aac1f`。

### V1（P2）未登录 gate 卡的登录 CTA 被拉伸到整卡宽（17/17 页）

- **期望**：admin-ui-design §4.3「宽度 | **内容宽，不得被容器拉伸**。卡片是 flex 列（`align-items: stretch`），直接放在卡片里的 action 会被拉成整卡宽 → **必须包一层 `row cross=start`**」；`arc-contracts.md` §21.6 同结论（实测 1372px/1402px → 包 `row cross=start` 后 63–102px）。
- **实测**：gate 卡 `w=1136`、`padding: 20px`、`border: 1px` → 内容宽 `1094px`；登录按钮 **`w=1094px`（= 内容宽的 100%）**、`h=38`、`padding: 8px 16px`、`borderRadius: 8px`。对照：admin 内容区按钮全部是内容宽（`63–185px`，如 dashboard 主操作 122.98×36、posts 行内 destructive 185.05×29）。
- **偏差量化**：按钮宽度 = 内容宽的 **100%**（标准要求内容宽）；对照同页其它控制台按钮的内容宽基线 **63–185px**（如 dashboard 主操作 122.98×36、posts 行内 destructive 185.05×29），即 **约 5.9–17×**。
- **复现**（guest 上下文，1803×908）：

  ```js
  // 无 cookie 上下文打开 /?page=dashboard
  (() => { const b = [...document.querySelectorAll('button,a.aup-action')].find(x=>x.getAttribute('data-variant')==='primary');
    const c = b.closest('div[style*="padding"]');
    return { btnW: b.getBoundingClientRect().width, btnH: b.getBoundingClientRect().height,
             cardPad: getComputedStyle(b.parentElement).padding,
             cardW: b.parentElement.getBoundingClientRect().width }; })()
  ```
  真实输出（guest dashboard，09:0x）：`{"btnW":1094,"btnH":38,"cardPad":"20px","cardW":1136}`；17/17 页 `btnW = 1094`（`raw/UI-007-guest.json` 每页 `btns[0].w`）。
- **建议修复**：把 gate 卡的登录 action 包进 `row cross=start`（`arc-contracts.md` §21.6 已验证的做法），或给 action 加 `style={alignSelf: "flex-start"}`；改完后 `btnW` 应回落到文字宽（按同标签内容宽估计 ≈ 110–160px）。**优先级 P2**（17 页首屏唯一 CTA，访客第一眼）。
- **根因**：gate 卡是 `view gap=sm` 的 flex 列，`action` 直接作为子节点 → 被 stretch。源码：`grep -rc 'padding: "20px"' .aup/pages/*/*.aup` → **19 个页面文件各 1 处**（17 个控制台页 + `compose-edit` + `settings-general`），例如 `.aup/pages/admin/dashboard.aup`、`.aup/pages/admin/posts.aup`、`.aup/pages/economy/access.aup:15`、`.aup/pages/economy/policy.aup:18` 的 gate 卡。

### V2（P2）gate 卡说明文字 `intent=info`：`--color-info` 在卡片底上 **4.49:1 < WCAG AA 4.5:1**

- **期望**：admin-ui-design §3.1「语义色（success / warning / danger / info）… **禁止用于装饰**」「**一个页面最多出现一个语义色焦点**」；正文对比度应满足 WCAG 2.1 AA ≥ 4.5:1（15px 正文）。
- **实测**：17/17 页 gate 卡的说明句 `p :gate-desc intent=info` computed `color: rgb(37, 99, 235)`（= `--color-info` #2563eb），落在 `--card-bg` #f0efec 上：

  | 前景 / 背景 | 对比度 | AA 4.5:1 |
  | --- | --: | --- |
  | `--color-info` #2563eb on `--card-bg` #f0efec（**gate 说明句，实测**） | **4.49:1** | ❌（差 0.01） |
  | `--color-info` on `--color-bg` #fafaf8 | 4.95:1 | ✅ |
  | `--color-dim` #6b6b78 on `--card-bg` | 4.57:1 | ✅（仅高出 0.07） |

- **偏差量化**：低于 4.5:1 阈值 **0.01**；且是 15px 正常字重的整句文案（不是大字），AA 无豁免。若 palette/tone 改一档即会显著破线。
- **复现**：guest `?page=<17 页任意>` → `getComputedStyle([...document.querySelectorAll('p')].find(p=>p.getAttribute('data-intent')==='info')).color` → `rgb(37, 99, 235)`；对比度脚本见 §6.3（`node /tmp/ui007-contrast.mjs` 同款公式，输出 `info on card 4.49`）。
- **建议修复**：gate 说明句改为 `intent=muted`（4.57:1，仍贴边，建议同时把 `--color-dim` 压深一档）或直接默认正文色（15.08:1）；同时符合 §3.1「语义色不用于装饰」。**优先级 P2**（17 页首屏 + 无障碍）。
- **根因**：页面 gate 卡内 `p :gate-desc intent=info`——`grep -rn 'p :gate-desc intent=info' .aup/pages/*/*.aup` 命中 **19 个页面文件各 1 处**（17 个控制台页 + `compose-edit` + 新的 `settings-general`），例：`.aup/pages/admin/compose.aup:33`、`.aup/pages/admin/appearance.aup:13`。

### V3（P2）行内 `destructive` 按钮文字对比度 3.99:1（posts 同屏 30 个 / hub / factory）

- **期望**：admin-ui-design §4.3「Danger | 需确认」+ §3.1「状态用色点+文字双编码」；文字对比度 AA ≥ 4.5:1（13.6px 正常字重）。
- **实测**：`variant=destructive size=sm` 按钮 computed `color: rgb(197, 48, 48)`（= `--color-danger` #c53030），背景 `color(srgb .7725 .1882 .1882 / 0.12)`（danger 12% 叠在 `--card-bg` 上 → 合成 `rgb(235,216,213)`）→ **3.99:1**。
- **偏差量化**：3.99 : 4.5 = 缺口 **0.51**；受影响按钮数（可见）：`?page=posts` **34**（首屏可见 30）、`?page=hub` 4、`?page=factory` 6（`raw/UI-007-admin.json` 各页 `destructiveCount`）。
- **复现**：

  ```js
  const b=[...document.querySelectorAll('button[data-variant="destructive"]')][0]; b.innerText;
  // → "Remove from public"；getComputedStyle(b).color → "rgb(197, 48, 48)"
  // 背景：getComputedStyle(b).backgroundColor → "color(srgb 0.772549 0.188235 0.188235 / 0.12)"
  ```
- **建议修复**：destructive 按钮在淡底上改用更深的危险色（或文字用 `--color-text`、只让描边/图标承担红色）；`--color-danger` 在 `--card-bg` 上单独用是 4.76:1（达标），问题只在「danger 文字 + danger 12% 底」的组合。**优先级 P2**。
- **根因**：平台 `destructive` variant 的运行时样式 + 页面 `action variant=destructive size=sm`（例 `.aup/pages/admin/posts.aup:172,209`）。**平台色值本身是运行时给的**——若确认为平台固定值，则本条应转记为「平台差异 + 主题令牌改进建议」，由 Lead 决定改 `--color-danger`（主题令牌）还是改用法。

### V4（P2）`?page=compose` 内容列 `gap=20px`（应 10px）

- **期望**：admin-ui-design §3.3「**控制台精修取值**：… 内容区滚动间隔 `gap=sm`(10px)」+「block 20px … 控制台不用」；`arc-contracts.md` §21.5「`gap=md` → 20px（= 默认值）… 写它等于没改」。
- **实测**：`?page=compose` 内容列 `row-gap: 20px`（另 15 页 `10px`）；5 张卡 → 4 个间隔 → 内容总高多出 **+40px**。
- **复现**：`getComputedStyle(<内容列>).rowGap` → `"20px"`（紧凑脚本 §6.1 输出 `"colGap":"20px"`）。
- **建议修复**：`.aup/pages/admin/compose.aup:122` 的 `view gap=md size={flex: 1} style={overflowY: auto}` → `gap=sm`。**优先级 P2**（唯一在详情密度上偏离的页之一；一行改动）。
- **根因**：`.aup/pages/admin/compose.aup:122`。

### V5（P2）`?page=factory` 内容列 `gap=20px`（应 10px）

- 同 V4；根因 `.aup/pages/ops/factory.aup:153`（`view gap=md size={flex: 1} style={overflowY: auto} propBind={…}`）。实测 `row-gap: 20px`，4 张卡 → +30px。**优先级 P2**。
- 注：17 页里 `gap=sm` 的有 15 页（`grep -rln "view gap=sm size={flex: 1} style={overflowY: auto}" .aup/pages/*/*.aup | wc -l` → `15`），差集正是 compose 与 factory。

### V6（P2）`?page=compose` 两个按钮圆角 32px（应 8px）

- **期望**：§4.3「圆角 | 全部 `var(--radius-md, 8px)`。运行时默认不一致（`primary` 8px、`secondary`/`ghost` 32px），**必须内联覆盖**」。
- **实测**：`compose` 的 `Save draft`（secondary）与 `Publish`（primary）computed `border-radius: 32px`（17 页里唯一用胶囊按钮的页面；其余页面的圆角集合是 `8px`，另有一类平台 `18×18` 按钮为 `3px`，见 §3.2）。
- **偏差量化**：32 vs 8 = **4×**；这 2 个按钮是本轮 17 页全部可见按钮（合计 142 个）里**唯一**圆角为 32px 的（`raw/UI-007-admin.json` 各页 `btnUniq.radius`）。
- **复现**：`?page=compose` → `[...document.querySelectorAll('button')].map(b=>getComputedStyle(b).borderRadius)` → `["32px","32px"]`（§6.1 紧凑脚本输出 `"radius":["32px"]`）。
- **建议修复**：`.aup/pages/admin/compose.aup:151,152` 两个 action 补 `style={borderRadius: "var(--radius-md, 8px)"}`（与其余 16 页一致）。**优先级 P2**。
- **根因**：`.aup/pages/admin/compose.aup:151`（`action variant=secondary label=:save-draft …`）、`:152`（`action variant=primary label=:publish-now …`）**均无 inline `borderRadius`**（对照 `posts.aup:138,145,151,170,171,172,208,209` 都有）。

### V7（P3）`?page=factory` 页面标题 21.6px（应 17px）

- **期望**：§3.4「`h2` | 页面标题，每页一个 | `fontSize: var(--type-subheading)`（17px，默认 heading 为 21.6px）」。
- **实测**：`h2 :title` computed `font-size: 21.6px`（= `--type-heading` 1.35rem），line-height 27px；15/17 页为 `17px`。
- **偏差量化**：+4.6px（+27%）；与同页卡片标题 15px 只差 6.6px，页面层级被压平。
- **复现**：`?page=factory` → `getComputedStyle(document.querySelector('h2')).fontSize` → `"21.6px"`（§6.1 输出 `"pageTitle":{"t":"Node NFT","fs":"21.6px"}`）。
- **建议修复**：`.aup/pages/ops/factory.aup:155` 的 `h2 :title level=2` 补 `style={fontSize: "var(--type-subheading)"}`。**优先级 P3**（表现层一致性，无功能影响）。
- **根因**：`.aup/pages/ops/factory.aup:155`（同型缺陷另见 `.aup/pages/admin/compose-edit.aup:37`，但该页不是控制台菜单页，不在 17 页内）。

### V8（P2）18 节后侧栏一屏放不下：溢出 56px（en）/ 86px（zh），页脚落到折叠线下

- **期望**：§2.5「**侧边栏不独立滚动**：菜单项数以 `CONSOLE_SECTIONS.length` 为准… **一屏可见**；极端窄高下溢出时侧边栏自身滚动」+ §2.1「侧栏页脚…是侧栏内**唯一的站点级入口**」。
- **实测**（1803×908，`?page=dashboard`，en）：

  ```json
  {"w":270.44,"clientH":860,"scrollH":916,"overflow":56,"rows":20,
   "active":"Dashboard","aria":"current=page","bg":"rgba(42, 110, 0, 0.08)","color":"rgb(42, 110, 0)",
   "pad":"8px 20px 8px 32px","footerBelowFold":true}
  ```
  逐行几何：内容区底 908；`General` 行 810.5–844.5；**页脚块 y=844.5、高 119、底 963.5 → 越出视口 55.5px**（`About` 877–904.5 勉强可见；`RSS` 904.5–932 与版权行被裁）。**zh（访客默认语言）更糟**：行高 36px（en 34px，见 §3.5），`scrollH 946 / clientH 860 → 溢出 86px`，页脚底 **993.5 → 越出 85.5px**，可见行 18/20。
- **偏差量化**：一屏预算 860px，实际内容 916px（en）/ 946px（zh）→ **溢出 56px / 86px**；17 节时同算式为 848.5px（刚好放得下），**第 18 节把这个预算挤爆**（触发者：`scripts/console-nav.mjs` 09:01:21 的改动）。
- **复现**：§6.1 紧凑脚本的 `sidebar` 字段（`overflow`、`footerBelowFold`）；或用 `/tmp/ui007-nav2.mjs` 的完整几何。
- **建议修复**（任选其一，需 Dev 与标准一起定）：① 压缩侧栏垂直节奏（行高 34→32 或分组标签 33.5→28）；② 18 节起把页脚改为可折叠/仅图标行；③ 明文承认「≥18 节时侧栏需滚动」，同时把 §2.5 的口径改为「分组与节数增长后允许侧栏自滚，但**页脚必须仍在首屏**」。**优先级 P2**（页脚是唯一站点级入口，现在首屏看不到；且中文更严重）。
- **注意**：这不是 `.aup` 页面里的手写样式，而是生成器（`scripts/console-nav.mjs` → `scripts/arcblog-console-nav.mjs`）产出 + 平台行高共同决定 → **需 Dev**。

### V9（P2）12 处卡片/行内标题用了运行期默认 17px（应 15px）

- **期望**：§3.4「`h2` / `h3`（**卡片内**）| 卡片标题、区块标题 | `fontSize: var(--type-body)`（15px）」；§3.3「列表行样式…行标题用 `h3` + `fontSize: var(--type-body)`(15px)」。
- **实测**：运行期 `h3` 的默认字号 = **17px**（`--type-subheading`），凡未内联声明字号的 `h3` 都会落到 17px。全 17 页扫描：**除页面标题外仍有 12 个 17px 标题**，分布在 4 页：

  | 页面 | 数量 | 实测标题（截断） | 源码根因 |
  | --- | --: | --- | --- |
  | `?page=compose` | 4 | Pre-publish checks / Metadata / SEO & social preview / Images | `.aup/pages/admin/compose.aup:124,128,139,155`（`h3 :checks/:meta/:seo/:images` 无 `style`） |
  | `?page=agents` | 4 | Current grants / Policy & declaration / Declared tools / Authorize an agent (CLI) | `.aup/pages/ops/agents.aup:142,162,168,181`（同页 `:170,172,174` **已**显式 15px → 同页自相矛盾） |
  | `?page=categories` | 3 | Design / Life / Technology（**列表行标题**） | `.aup/pages/site/categories.aup:121`（`h3 "${entry.content.name}"`） |
  | `?page=dashboard` | 1 | ArcBlog（节点卡标题） | `.aup/pages/admin/dashboard.aup:129`（`h3 "${state.nodeProfile.name}"`） |

- **偏差量化**：17px vs 15px = **+2px（+13.3%）**；12 处；`categories` 的 3 处直接违反 §3.3 的显式行标题配方。
- **复现**：

  ```js
  [...document.querySelectorAll('h3')].filter(h=>h.getBoundingClientRect().width>0 && getComputedStyle(h).fontSize!=='15px')
    .map(h=>[h.innerText.trim().slice(0,24), getComputedStyle(h).fontSize])
  ```
  `?page=categories` → `[["Design","17px"],["Life","17px"],["Technology","17px"]]`。
- **建议修复**：这 12 处补 `style={fontSize: "var(--type-body)"}`（`agents` 页已有 3 处同型正确写法可抄）。**优先级 P2**（`categories` 列表行标题是显式标准；其余为层级一致性）。

---

## 3. 可接受的平台差异（写明理由，不要求 Dev 修）

### 3.1 `auto-surface`（`?page=appearance`）内部样式不受控制台 token 管辖

- **实测**：外壳 `[data-aup-id$="auto-surface-1-card"][data-variant=settings-page]`：`padding: 0px`、`rowGap: 0px`、`borderRadius: 10px`、`boxShadow: 0 1px 2px rgba(26,26,31,.08)`；内层 `[data-variant=settings-section]` 自己带 **`padding: 20px`**；其 `h2` 是 **21.6px**（平台默认 heading），表单控件也是平台样式。
- **理由**：`auto-surface` 是平台原语（`.agents/skills/aup-dsl/references/primitives.md` 列为 verified usage `auto-surface`），内部结构/内边距/标题字号**不读**页面的 `style`，控制台无法用内联样式把它对齐到 §3.3 的 14px / §3.4 的 17px。`?page=appearance` 的内容区因此天然是「平台外观」。
- **结论**：**平台差异（可接受）**。但建议标准补一句免责说明（§7 文档缺口 D3）——否则「§9 Token：无硬编码…」「§3.3 控制台统一 14px」在 appearance 上永远判不通过。

### 3.2 平台 `.aup-copy-btn` / `.aup-qr-btn`：18×18、3px、11.52px Arial、英文 title、opacity .55

- **实测**：`{w:18,h:18,borderRadius:"3px",fontSize:"11.52px",fontFamily:Arial,opacity:"0.55",title:"Copy"}`（`key-value-list` 的 `copyable` 行）；`data-format="did"` 的文本行则是 `title="Copy address"` + `.aup-qr-btn title="Show QR code"`，文本**已中间截断**（`did:key:…262699`）。
- **理由**：全部由平台渲染（仓库内 `grep -rn "aup-copy-btn" .aup .web scripts` → **0 命中**，只出现在 `.agents/skills/aup-dsl/references/primitives.md` 与我的 raw JSON 里），不能内联改。
- **结论**：**平台差异**。两条附带结论：
  1. **UI-001 的 F8 前提已过时**：现在控制台**有**复制入口，且 DID 是平台级「中间截断 + 复制 + 二维码」（`?page=hub` 每行 `did:key:…262699`；`?page=operations` / `agents` / `factory` 的 `key-value-list copyable` 行有 `Copy`）。**不要再提「自建复制组件 + frame」**——平台已给。
  2. 平台按钮 **18×18 < WCAG 2.5.8 的 24×24 最小命中区**、`title/aria` 只有英文（无 i18n）。这两点建议记入 `docs/arc-contracts.md`（Lead 写范围），不要在本仓库里造样式覆盖平台类名。

### 3.3 页面根容器 `scrollWidth > clientWidth`：是 100vw 全出血的预期结果

- **实测**：17/17 页都有 2 个元素 `scrollWidth > clientWidth`：`<page>-view-1`（1502 vs 1200）与 `<page>-view-1-view-1`（1470 vs 1136）——正是 `arc-contracts.md` §24 的「cap 只作用于页面根的直接子元素，`overflow: visible` 让 `width:100vw` 逃逸」。
- **判定**：**预期**，因为 `document.documentElement.scrollWidth === clientWidth === 1803`（无横向滚动条）。
- **给 QA 的提醒**：判「无横向滚动」要用**文档级**断言，别用「任一元素 `scrollWidth>clientWidth`」——后者在这 2 个容器上必然为真（假阳性）。

### 3.4 列表行的左右内边距由运行时 `!important` 决定

- 与 `arc-contracts.md` §21.7 一致：`.aup-list-template-item` 的左右内边距不可用内联样式覆盖；本走查只量到行内 `padding: 8px 0` 的效果（上下 8px）。**平台差异**，不作为偏差。

### 3.5 字体度量差异：同一 `font-size: 14.4px`，en 行高 18px / zh 行高 20px

- **实测**：`line-height: normal`，字体 `Sora, "PingFang SC", …`。同一侧栏行：

  | 语言 | 行高（实测 `getBoundingClientRect().height`） | 字号 |
  | --- | --: | --- |
  | en（`Hero` / `SEO` 等拉丁标签） | **34px** | 14.4px |
  | zh（`仪表盘` / `分类` 等 CJK 标签） | **36px** | 14.4px |

  同一按钮：admin 主操作 `Write a post` 36px（en）vs gate 登录 CTA `使用 DID Wallet 登录` 38px（zh）。
- **判定**：**平台/字体差异（可接受）**，且标准 §7「按钮与标签不得写死宽度」在实现里成立（侧栏行宽恒定 269.44px，标签不换行）。
- **但它推翻了 §4.3 的固定高度期望**（见 §7 文档缺口 D2）：`39px / 31px` 是本机旧主题字体下的测量值，当前实测 `36/29`（en）、`38`（zh CTA）。

### 3.6 `?locale=` 查询参数不能连续切换（测量方法限制，非缺陷）

- 实测：同一个 tab 依次 `?page=dashboard&locale=en`（→`lang=en`）、`&locale=zh`（→`zh`）、`?page=posts&locale=en`（→**仍是 `zh`**）。即 locale 被首次/早期加载持久化，后续同 tab 的同名参数被忽略。
- **影响**：本轮的 en/zh 对照是**两个会话**分别得到的（admin=en、guest=zh），不是同一页的逐项对照；要做逐页双语几何对照需**每语言一个新 tab/新上下文**。
- **判定**：记录为方法限制 + 给 QA 的建议（不要在同一 tab 里连续换 locale 来对比）。

---

## 4. 对比度（正文与次级文字）

公式：WCAG 2.1 相对亮度，`(L1+0.05)/(L2+0.05)`；alpha 色先做**合成**（叠在其实测背景上）。阈值：正常字重文字 4.5:1，大字/UI 组件 3:1。

| 前景 / 背景 | 对比度 | 4.5:1 | 3:1 |
| --- | --: | --- | --- |
| 正文 `--color-text` on 页面 `--color-bg` | **16.59:1** | ✅ | ✅ |
| 正文 on 卡片 `--card-bg` | **15.08:1** | ✅ | ✅ |
| 次级 `--color-dim` on 页面 bg | **5.02:1** | ✅ | ✅ |
| 次级 dim on surface `#ffffff`（侧栏） | **5.25:1** | ✅ | ✅ |
| **次级 dim on 卡片 `--card-bg`（实测卡片说明文字）** | **4.57:1** | ✅（仅 +0.07） | ✅ |
| 强调 `--color-accent` on 页面 bg | **6.04:1** | ✅ | ✅ |
| 强调 accent on surface `#fff` | **6.31:1** | ✅ | ✅ |
| 当前菜单行 accent on accent-bg（合成卡片底） | **4.92:1** | ✅ | ✅ |
| 主按钮文字 `--color-bg` on `--color-text` | **16.59:1** | ✅ | ✅ |
| 次级按钮文字 text on accent-bg（合成） | **13.52:1** | ✅ | ✅ |
| danger #c53030 on 页面 bg | **5.23:1** | ✅ | ✅ |
| **destructive 按钮文字 rgb(197,48,48) on danger-12% 合成底（实测，34 个按钮）** | **3.99:1** | ❌ | ✅ → 见 V3 |
| **gate 说明句 `--color-info` on `--card-bg`（实测，17 页首屏）** | **4.49:1** | ❌ | ✅ → 见 V2 |
| success #0f766e / warning #a16207 / info #2563eb on 页面 bg | 5.24 / 4.71 / 4.95 | ✅ | ✅ |
| 边框 `--color-border` on 卡片（合成） | 1.19:1 | ❌ | ❌（1px 分隔线，非承载信息的边界，仅登记数值） |

**结论**：文字令牌整体达标；**两处破 AA 都在「把语义色/强调色用在淡底上」的组合**（V2、V3），不是令牌本身选错——`--color-danger` / `--color-info` 在页面底上分别是 5.23 / 4.95。另注意 `--color-dim` 在卡片底上 4.57:1 只高出阈值 0.07：**任何 tone/palette 调整都可能把它压破**，建议把 dim 在 card-bg 上的组合列入主题回归项。

---

## 5. 未登录访客（guest 上下文，`lang=zh`）逐页

> 方法：CDP `Target.createBrowserContext()`（无 cookie）→ 每页 `Page.navigate` + 3.4s。admin 会话下 17 页的 `gate` 字段**全为 `null`**（该字段 = 首个 `padding: 20px` 的卡片；admin 侧内容卡一律 14px，即不渲染 gate 卡），这也复核了 admin-ui-design §6「匿名只见登录卡」的对照面。

| 页面 | URL 回落 | 可见 h2（gate 标题） | gate 卡 padding | 圆角 | 阴影 | 登录按钮 |
| --- | --- | --- | --- | --- | --- | --- |
| `?page=dashboard` | 否 | 仪表盘 | 20px | 10px | none | primary h38 r8px 14.4px w1094 |
| `?page=posts` | 否 | 创作者工作室 | 20px | 10px | none | 同上 |
| `?page=pages` | 否 | 页面 | 20px | 10px | none | 同上 |
| `?page=compose` | 否 | 用钱包发布 | 20px | 10px | none | 同上 |
| `?page=heroes` | 否 | 站点 | 20px | 10px | none | 同上 |
| `?page=categories` | 否 | 站点 | 20px | 10px | none | 同上 |
| `?page=tags` | 否 | 站点 | 20px | 10px | none | 同上 |
| `?page=seo` | 否 | 站点 | 20px | 10px | none | 同上 |
| `?page=feeds` | 否 | 站点 | 20px | 10px | none | 同上 |
| `?page=appearance` | 否 | 外观 | 20px | 10px | none | 同上 |
| `?page=operations` | 否 | 运维 | 20px | 10px | none | 同上 |
| `?page=hub` | 否 | Hub 管理 | 20px | 10px | none | 同上 |
| `?page=media` | 否 | 运维 | 20px | 10px | none | 同上 |
| `?page=agents` | 否 | 运维 | 20px | 10px | none | 同上 |
| `?page=policy` | 否 | 经济 | 20px | 10px | none | 同上 |
| `?page=access` | 否 | 经济 | 20px | 10px | none | 同上 |
| `?page=factory` | 否 | 节点 NFT | 20px | 10px | none | 同上 |

**gate 卡 `padding: 20px` 是已裁定豁免，不是偏差**：REQ-002 §3 A6 ——「**gate 卡（未登录登录门）豁免本口径，保持现状 20px**——它不是控制台内容卡，D4 已裁定不予统一；因此**不得**再要求「17 页 gate 卡 20px→14px」」，并附 Lead 2026-09-27 的 D4 裁定留档。实测 17/17 页 = 20px、内容卡 = 14px，与豁免一致；`?page=compose` 与 `?page=compose-edit` 的 gate 也都已统一为 20px（REQ-004 §A5 顺手项）。
**但标准文本没写这条豁免**（§3.3 只有「控制台统一 14px」）→ 记为文档缺口 D1，只报告不改（加豁免属于改口径）。

访客态另三点（均已在 §2/§3 展开，不重复计数）：
- 每页只渲染 1 张卡（gate 卡）、**侧栏 0 行**（`navRow: null`）、**内容列滚动容器 0 个**（`contentCols: 0`）→ admin-ui-design §6/§9「匿名只见登录卡」✅；
- gate 说明句 `intent=info` 4.49:1 < AA → **V2**；
- gate 登录 CTA 被拉成 1094px 整卡宽 → **V1**；
- gate 卡内 `h2 :gate-title` = 15px（`var(--type-body)`），符合 §3.4「卡片内标题 15px」✅。

---

## 6. 可复现的走查命令 / 脚本清单

### 6.1 一行式（最少依赖，Node ≥ 22 自带全局 `WebSocket`）

```bash
# 前置：共享调试 Chrome 已在 9333 且 arcblog.localhost:4939 可访问
curl -s http://127.0.0.1:9333/json/version | head -3     # 确认 CDP 活着
node /tmp/ui007-probe-compact.mjs                        # 无参数 = 全部 17 页
node /tmp/ui007-probe-compact.mjs compose,factory        # 只跑两页（约 7s）
```

`/tmp/ui007-probe-compact.mjs` 的**核心求值表达式**（去掉 CDP 外壳，可直接贴进 DevTools Console 逐页跑）：

```js
(() => {
  const gs = (e) => getComputedStyle(e), px = (v) => Math.round(parseFloat(v) * 100) / 100;
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const root = gs(document.documentElement), cardBg = (() => {
    const s = document.createElement('span'); s.style.color = root.getPropertyValue('--card-bg').trim();
    document.body.appendChild(s); const c = gs(s).color; s.remove(); return c; })();
  const isCard = (e) => { const s = gs(e); return s.backgroundColor === cardBg && s.borderTopStyle === 'solid' && parseFloat(s.borderTopWidth) > 0; };
  const cards = [...document.querySelectorAll('*')].filter((e) => vis(e) && isCard(e));
  const an = document.querySelector('[data-active="true"]'), nav = an && an.parentElement;
  const hdr = document.querySelector('.aup-app-header');
  const col = [...document.querySelectorAll('*')].filter((e) => /auto|scroll/.test(gs(e).overflowY)
      && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) && !(hdr && e.contains(hdr)) && !(nav && e.contains(nav)))[0];
  const btns = [...document.querySelectorAll('button,a.aup-action')].filter(vis)
      .filter((b) => !(hdr && hdr.contains(b)) && !(nav && nav.contains(b)));
  const one = (a) => [...new Set(a)];
  const h2 = [...document.querySelectorAll('h2')].filter(vis);
  return JSON.stringify({
    lang: document.documentElement.lang,
    pageTitle: h2[0] ? { t: h2[0].innerText.trim().slice(0, 20), fs: gs(h2[0]).fontSize } : null,
    colGap: col ? gs(col).rowGap : null,
    cardPad: one(cards.map((c) => gs(c).padding)), cardGap: one(cards.map((c) => gs(c).rowGap)),
    cardRadius: one(cards.map((c) => gs(c).borderRadius)), cardShadow: one(cards.map((c) => gs(c).boxShadow)),
    btn: { n: btns.length, primary: btns.filter((b) => b.getAttribute('data-variant') === 'primary').length,
      destructive: btns.filter((b) => b.getAttribute('data-variant') === 'destructive').length,
      radius: one(btns.map((b) => gs(b).borderRadius)), h: one(btns.map((b) => px(b.getBoundingClientRect().height))),
      fs: one(btns.map((b) => gs(b).fontSize)) },
    sidebar: nav ? { w: px(nav.getBoundingClientRect().width), clientH: nav.clientHeight, scrollH: nav.scrollHeight,
      overflow: nav.scrollHeight - nav.clientHeight, rows: nav.querySelectorAll('button,a.aup-action').length,
      active: an.innerText.trim(), ariaCurrent: an.getAttribute('aria-current'),
      bg: gs(an).backgroundColor, color: gs(an).color, pad: gs(an).padding,
      footerBelowFold: nav.lastElementChild.getBoundingClientRect().bottom > innerHeight } : null,
    copyBtn: (() => { const c = document.querySelector('.aup-copy-btn'); return c ? { w: px(c.getBoundingClientRect().width), h: px(c.getBoundingClientRect().height), fs: gs(c).fontSize, title: c.title } : null; })(),
  });
})()
```

实测输出（09:12，1803×908，admin/en；节选自 `/tmp/ui007-probe-compact.mjs`）：

```text
dashboard {"lang":"en","pageTitle":{"t":"Dashboard","fs":"17px"},"colGap":"10px","cardPad":["14px"],"cardGap":["10px"],
  "btn":{"n":4,"primary":1,"destructive":0,"radius":["8px"],"h":[36],"fs":["14.4px"]},
  "sidebar":{"w":270.44,"overflow":56,"rows":20,"active":"Dashboard","aria":"page","bg":"rgba(42, 110, 0, 0.08)",
  "color":"rgb(42, 110, 0)","pad":"8px 20px 8px 32px","footerBelowFold":true}}
compose   {"colGap":"20px","btn":{"n":2,"primary":1,"radius":["32px"],"h":[36]},"sidebar":{"overflow":56}}
factory   {"pageTitle":{"t":"Node NFT","fs":"21.6px"},"colGap":"20px","btn":{"n":22,"primary":1,"destructive":6,"radius":["3px","8px"],"h":[18,36,29]}}
```

> 读数注意：`dashboard` 的按钮数会在 **4–6** 之间波动——平台 `.aup-copy-btn` / `.aup-qr-btn`（§3.2）只有在所在卡片的 `propBind` 数据落地后才出现（`arc-contracts.md` §21.11 的首屏竞态）；量按钮「数量」时应固定读数时机或连读两次取并集。`raw/UI-007-admin.json` 的 `dashboard` 是 6 个（含 2 个平台按钮），§6.1 的紧凑脚本那一次是 4 个。

### 6.2 未登录访客（隔离上下文，zh）

```js
// CDP：先建无 cookie 上下文，再在其中建 target，再对每个 ?page= 导航
const ver = await fetch('http://127.0.0.1:9333/json/version').then(r => r.json());   // 连 browser ws
const { browserContextId } = await bsend('Target.createBrowserContext', {});
const { targetId } = await bsend('Target.createTarget', { url: 'about:blank', browserContextId });
// 断言：gate 卡 padding=20px（已裁定豁免）、h2=中文 gate 标题、侧栏 0 行（无 [data-active]）、内容列滚动容器 0 个
```

### 6.3 对比度（纯 Node，不连浏览器）

```bash
node /tmp/ui007-contrast.mjs      # 输出 §4 的全部比值（含 alpha 合成）
# info on card 4.49 / dim on card 4.57 / danger on danger-12% 3.99 …
```

### 6.4 本报告用到的辅助脚本（均在 `/tmp`，按约定不放仓库）

| 脚本 | 作用 |
| --- | --- |
| `/tmp/ui007-probe.mjs` | 全量探针（17 页 × 每页 ~3.4s，含卡片清单、标题清单、按钮清单）→ 产出 `raw/UI-007-*.json` |
| `/tmp/ui007-probe-compact.mjs` | 精简可嵌入版（§6.1） |
| `/tmp/ui007-precision.mjs` | 盒模型精度探针（box-sizing / line-height / border / opacity / auto-surface 内层） |
| `/tmp/ui007-stretch.mjs` | 「按钮是否被拉伸到卡片内容宽」审计（17 页） |
| `/tmp/ui007-nav2.mjs` | 侧栏一屏预算几何（clientH/scrollH/逐行 y、页脚是否落到折叠线下，en+zh） |
| `/tmp/ui007-locale.mjs` | `?locale=en` / `?locale=zh` 几何对照 + 横向溢出候选 |
| `/tmp/ui007-flake.mjs` | 深链回落专项复现（3 轮 × 17 页 = 51 次直达加载） |
| `/tmp/ui007-contrast.mjs` | 令牌对比度（含 alpha 合成） |

### 6.5 本轮的实际执行记录（真实输出）

```text
$ arc service status | head -3                    # 2.0.0-beta.50 (c711b9aa)，daemon 起在 :4939
$ node /tmp/ui007-flake.mjs                       # 09:02:22–09:04:36
  total 51 fallbacks 0
$ node /tmp/ui007-probe.mjs --out docs/team/design/raw/UI-007-admin.json
  … 17 行 "probed admin <page>: cards=… pad=… h2=… btns=…" → 0 回落
$ node /tmp/ui007-probe.mjs --guest --out docs/team/design/raw/UI-007-guest.json
  … 17 行 "probed guest <page> …" → 0 回落（gate pad 全为 20px）
$ node /tmp/ui007-nav2.mjs                        # en：overflow 56 / footerBottom 963.5 / belowFold true
$ sed 's/?page=dashboard/?page=dashboard&locale=zh/' → node /tmp/ui007-nav2.mjs
  zh：clientH 860 scrollH 946 overflow 86 footerBottom 993.5 belowFold true visibleRows 18/20

# 本轮改动后的质量门（UI 只改了 2 个文档，未改 .aup，故不跑 arc blocklet build）
$ arc dsl validate --json | tail -3     → "issues": []
$ npm test | tail -8                    → pass 28 / fail 0（964ms，fast tier passed）
$ node scripts/arcblog-console-nav.mjs --check | tail -3  → {"action":"check","pages":18}（无漂移报错）
$ arc dsl generate --check | tail -3    → Would generate 0 file(s) (dry-run) — nothing to change
```

---

## 7. 与既有结论的关系 / 文档事实对齐

### 7.1 UI-001 发现项的复核（现状，2026-09-28）

| UI-001 条目 | 现状（本轮实测） | 判定 |
| --- | --- | --- |
| F2 `?page=posts` 一屏 30 个 `primary` | 现在**可见 `primary` = 1**（`New post`）；73 个 `size=sm` 行内按钮改为 `secondary` / `destructive`（其中 destructive 34 个，posts.aup:208/209） | **已修** |
| F4 `?page=appearance` 两个 `h2` | 现在可见 `h2` = **1**（来自 `auto-surface` 自己的标题，21.6px）；页面 `h2 :title` 已删、保留 `p :desc` | **已修**（遗留：标题字号由平台决定 → §3.1） |
| F6 gate 卡 20px | 17/17 仍是 20px，但 **Lead D4 + REQ-002 §A6 已裁定豁免** | **不是偏差**（口径见 §5） |
| F8 「控制台无复制入口 / DID 全量渲染」 | **前提不成立**：平台对 `data-format="did"` 文本做中间截断（`did:key:…262699`）+ `.aup-copy-btn` + `.aup-qr-btn`；`key-value-list copyable` 行有 `Copy` | **已由平台解决**（建议反馈 PM 关闭/改写该条，勿再提自建组件） |
| F9 侧栏页脚 | 品牌 / 关于 / RSS / 版权四行已渲染 | **已修**（新问题见 V8：落到折叠线下） |
| F11 `?page=compose` 无页头 | 现在可见 `h2` = **1**（`Write a post` 17px） | **已修** |
| F5 行内裸枚举 / 双编码 | 本轮未逐页重判（本轮聚焦像素/令牌/对比度）；`raw/UI-007-admin.json` 的 `textSample` 仍可见 `published / failed / paid` 等裸枚举 | **未复测定性**（留给 QA/PM） |
| F3 空态英文文案 | 未复测 | **未复测**（平台限制，`arc-contracts.md` §20） |

### 7.2 文档事实错误：**已按 L-R11-2 修正 1 处**（`docs/ArcBlog-admin-ui-design.md` §2.1）

**修正对象**：§2.1 的「选中菜单项」「当前菜单项」两行——它们把当前行描述成**深色实心块**（`background: var(--color-text)` + `color: var(--color-bg)`），与实现、与 §2.3 第 122 行、与 `arc-contracts.md` §23 全都相反：

```bash
$ node /tmp/ui007-navpad.mjs
[{"t":"Dashboard","pad":"8px 20px 8px 32px","active":"true","bg":"rgba(42, 110, 0, 0.08)","color":"rgb(42, 110, 0)"},
 {"t":"Studio","pad":"8px 20px 8px 32px","active":null,"bg":"rgb(255, 255, 255)","color":"rgb(26, 26, 31)"}, …]
```

即：当前行 = `--color-accent-bg`（`rgba(42,110,0,.08)`）+ `--color-accent`（`rgb(42,110,0)`），**不是**深色块；且实测**选中/未选中共用同一左内边距 32px**（原文写「均为 20px」）。`arc-contracts.md` §23 明确：运行时的安全样式过滤会丢掉 `action` 上的自定义 `background`/`color`，所以原文描述的写法本来就不生效——**这是事实错误，不是口径分歧**。修正只替换这两行的描述与数值，保留「不用 `variant=primary`（它会居中标签造成位移）」「共用同一左对齐内边距」两条要求。

**逐字节 before/after**（全部改动 = 3 行：版本头 + §2.1 两行；用 `git diff docs/ArcBlog-admin-ui-design.md` 复核）：

| 行 | before（V1.5） | after（V1.6） |
| --- | --- | --- |
| 版本头 | `**文档版本：** V1.5（Round 10 · …` | `**文档版本：** V1.6（Round 11 · 2026-09-28，授权书 **L-R11-2 事实对齐**：…）· V1.5（Round 10 · …`（V1.5 原文逐字节保留在后半段） |
| §2.1 选中菜单项 | `深色实心块（\`background: var(--color-text)\`，文字 \`var(--color-bg)\`），…（实测两者文字左缩进均为 20px）…` | `**强调色块**（平台 \`active=true\` 渲染：实测 \`background: var(--color-accent-bg)\` = \`rgba(42,110,0,.08)\` + 文字 \`var(--color-accent)\`，见 §2.3 与 \`arc-contracts.md\` §23），…（2026-09-28 实测两者 \`padding-left\` 均为 32px）…` |
| §2.1 当前菜单项 | `深色实心块（内联 \`background: var(--color-text)\` + \`color: var(--color-bg)\`），…` | `**强调色块**（同上：平台 \`active=true\` → \`data-active="true"\` + \`aria-current="page"\`，由运行时按 accent token 上色；写在 \`action\` 上的内联 \`background\`/\`color\` 会被运行时的安全样式过滤丢弃，\`arc-contracts.md\` §23），…` |

**期望值未动**：§3 的全部令牌取值、§4.3 尺寸表、§9 的十二条判据与两个等价断言块一字未改。

### 7.3 待观察项（不作缺陷定性）

`?page=<name>` 在**并发写实例/daemon 重载窗口**内 3 次被静默归一化到首页（URL 丢掉 `page=`），时间点与 Dev 的写实例窗口重合（`.gate-lock` 08:43:03–09:01:06、`.aup/app.json` 改写 08:44:07/08:52:55、`scripts/console-nav.mjs` 09:01:21）；锁释放后的 51 次专项直达加载 **0 复现**，干净两遍 17 页扫描也 **0 复现**。**结论：并发窗口内的瞬时行为，未定性为缺陷**；建议 Dev/QA 在无人写实例时用 §6.4 的 `ui007-flake.mjs` 跑 200 次以定性（若复现率非零，则升 P2 深链缺陷）。

### 7.4 文档缺口（只报告，不改——改这些等于改口径/期望值，需 Lead 裁定）

| # | 位置 | 缺口 | 证据 |
| -- | --- | --- | --- |
| D1 | §3.3「控制台统一值 14px」 | 未写 **gate 卡豁免 20px**（豁免只存在于 `docs/team/requirements/REQ-002-console-consistency-fixes.md` §3 A6 + D4 裁定留档），导致标准与实现看似冲突 | 实测 17/17 gate 20px；REQ-002 §3 A6 原文 |
| D2 | §4.3 尺寸档表（「高度 39px / 31px」） | 高度是**字体度量派生**（`line-height: normal` + Sora + CJK/Latin 差异），当前实测 **36px（en）/ 38px（zh CJK）/ sm 29px**；固定值已不成立 | §3.5 表 + `/tmp/ui007-precision.mjs`（`boxSizing: border-box`、`lineHeight: normal`） |
| D3 | §3.3 / §4 | 未写 **`auto-surface` 内容区不受控制台 token 管辖**（平台自带 20px padding、默认阴影、21.6px 标题） | §3.1 实测 |
| D4 | §9 验收清单 | 缺「侧栏一屏可见 / 页脚首屏可见」的可执行断言；新增第 18 节后该口径首次被打破 | V8 实测（overflow 56/86px） |
| D5 | §2.1「侧边栏样式」行「菜单项…左右内边距 `8px 20px`」 | 与同表「菜单项（二级）文字左缩进 32px」及实测 `padding: 8px 20px 8px 32px` 冲突（措辞歧义，未改） | `/tmp/ui007-navpad.mjs` 输出 |

---

## 8. 验收方式（每条可被 Dev/QA 独立复现）

| # | 验收断言（改前 → 改后期望） | 复现命令 |
| -- | --- | --- |
| A1（V1） | guest 任一页登录 CTA `getBoundingClientRect().width` 从 **1094** 降到 ≈ 文字宽（<200px）；`h≈36–38` 不变 | `node /tmp/ui007-probe-compact.mjs dashboard`（guest 上下文版本：§6.2） |
| A2（V2） | guest gate 说明句 computed `color` 不再是 `rgb(37, 99, 235)`；与卡片底对比度 ≥ 4.5:1 | §6.3 对比度脚本 + `raw/UI-007-guest.json` 的 `paras[*].intent==='info'` |
| A3（V3） | `?page=posts` 的 `destructive` 按钮文字与自身底的对比度 ≥ 4.5:1（现 3.99） | `getComputedStyle(btn).color` + `backgroundColor` → §6.3 公式 |
| A4（V4/V5） | `?page=compose` 与 `?page=factory` 内容列 `rowGap === "10px"`（现 20px） | `node /tmp/ui007-probe-compact.mjs compose,factory` → `colGap` |
| A5（V6） | `?page=compose` 两个按钮 `borderRadius === "8px"`（现 32px） | 同上 → `btn.radius` |
| A6（V7） | `?page=factory` 页面标题 `fontSize === "17px"`（现 21.6px） | 同上 → `pageTitle.fs` |
| A7（V8） | 1803×908 下侧栏 `scrollHeight <= clientHeight`，或（若接受自滚）页脚块 `bottom <= 908`；zh 同判 | `node /tmp/ui007-nav2.mjs`（en）与加 `&locale=zh` 的对照 |
| A8（V9） | 全 17 页 `h3` 字号集合 = `{15px}`（除页面标题 `h2`） | `node /tmp/ui007-probe-compact.mjs` 后跑 §2-V9 的 JS 过滤 |
| A9（通用门） | `arc dsl validate --json` → `issues: []`；`npm test` → 28/28；改了 `.aup` → `arc blocklet build`；`node scripts/arcblog-console-nav.mjs --check`；`arc dsl generate --check` | 见 CLAUDE.md「Quality gates」 |
| A10（受限项，如实标注） | 本轮**未点击任何写操作**：行内 Publish / Delete / 入队 worker 的**行为**未验证；深色模式、非 admin 已登录会话的权限边界、逐页 en/zh 对照（同一 tab 不可行）均未验 | — |

---

## 9. 待 PM 派活（一句话清单）

1. **V1**（P2）17 页 gate 登录 CTA 包 `row cross=start`（禁拉伸）。
2. **V2**（P2）gate 说明句 `intent=info` → `intent=muted`（对比度 4.49→4.57，或改令牌）。
3. **V3**（P2）destructive 按钮文字/底对比度 3.99:1（改用法或 `--color-danger`；需 Lead 定）。
4. **V4/V5**（P2）compose.aup:122、factory.aup:153 `gap=md` → `gap=sm`。
5. **V6**（P2）compose.aup:151,152 补 `borderRadius: var(--radius-md, 8px)`。
6. **V9**（P2）12 处 `h3` 补 `fontSize: var(--type-body)`（compose 4 / agents 4 / categories 3 / dashboard 1）。
7. **V8**（P2）侧栏 18 节溢出：先由 Lead 定口径（压缩行高 / 页脚改造 / 改为允许自滚但页脚必须在首屏），再交 Dev。
8. **V7**（P3）factory.aup:155 标题补 `--type-subheading`。
9. **文档 D1–D5**（需 Lead 裁定，UI 不擅自改口径）。
10. **UI-001 F8 建议关闭或改写**（平台已提供 DID 截断 + 复制 + QR，证据见 §3.2）。
