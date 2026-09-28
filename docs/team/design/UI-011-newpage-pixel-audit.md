# UI-011：`?page=general` / `?page=diagnostics` 像素级走查补充 + 订单/账本新页骨架建议

| 字段 | 值 |
| ---- | -- |
| 提案号 | **UI-011** |
| 状态 | 走查完成：**1 条实现偏差（D-01，P2）** + **8 条平台差异（P-01…P-08）** + 1 条待观察项；**骨架建议（§6）本轮不实施**，交 Dev / 下一轮决定 |
| 提出轮次 | **Round 14**（UI `task-46`；Lead **L-R14-1** 限定范围：**只走已稳定的 `general` / `diagnostics`**，走查对象**不含** Dev 本轮新建页） |
| 上游依据 | [`REQ-018`](../requirements/REQ-018-newpage-pixel-audit.md)（验收 A0–A9）· [`docs/ArcBlog-admin-ui-design.md`](../../ArcBlog-admin-ui-design.md)（行号均**本轮现取**，见 §5.2）· [`UI-007`](UI-007-console-pixel-walkthrough.md)（方法与先例 V 批）· [`UI-009`](UI-009-v3-contrast-and-visual-debt.md) / [`UI-010`](UI-010-v3-aii-implementation.md)（平台差异判定与真 DOM 断言先例）· `docs/arc-contracts.md` §21/§23/§24/§25 · spec §15.9（两页）· spec §15.7 / §50 / §89 / §92（仅作 §6 骨架建议的对象） |
| 实现方 | **需 Dev**：D-01（`.aup/pages/admin/general.aup:171,180,189`，**本轮未改**）｜**UI 自改**：本报告 + `raw/**`（`docs/team/design/**`）｜**未改** `docs/ArcBlog-admin-ui-design.md`（无事实错误，只有缺口 → §7 只登记） |
| 原始输出 | [`raw/UI-011-admin.json`](raw/UI-011-admin.json)（2 页 admin 实测）· [`raw/UI-011-guest.json`](raw/UI-011-guest.json)（2 页无 cookie 访客）· [`raw/UI-011-cdp-probes.txt`](raw/UI-011-cdp-probes.txt)（临时探针逐条命令与输出）· [`raw/UI-011-contrast.mjs`](raw/UI-011-contrast.mjs) + [`raw/UI-011-contrast-output.txt`](raw/UI-011-contrast-output.txt)（派生对比度）· [`raw/UI-011-probe.mjs`](raw/UI-011-probe.mjs)（可复跑探针，支持 `--target` 钉住标签页） |
| 零源码改动自证 | `git status --short -- docs/team/design docs/ArcBlog-admin-ui-design.md` → 只有本报告与 `raw/**`（**7 个未跟踪文件**：报告 1 + `raw/UI-011-*.{json,txt,mjs}` 6）；`git status --short -- .aup .web scripts world blocklet.yaml dist` 的 66 项**全部属于 Dev `task-45`**（`scripts/console-nav.mjs` 12:18:21、`.aup/pages/economy/{orders,ledger}.aup` 12:18–12:20、`dist/**` 12:31:39）；`diff -r .aup dist/.aup` → **0 行**（Dev 的 build 与源码同步） |

> **一句话**：`?page=general` 与 `?page=diagnostics` 的排版 / 间距 / 圆角 / Token / 对比度 / 命中区 / 骨架全部达标；**唯一实现偏差是三只 `Save` 按钮被同级带 `label` 的字段行拉伸到 60–62px**（同页其它 `size=sm` 按钮是 29px）；其余“对不上标准”的项**都是平台配方**（平台 `key-value-list` 的 16px gap/10px padding、`.aup-copy-btn` 18×18、`monospace`/`hideWhenEmpty` 两个 prop 不生效、时间 `title` 固定中文格式）。

---

## 0. 范围、方法与快照

### 0.1 范围（严格照 L-R14-1）

- **走查对象**：`?page=general`（`.aup/pages/admin/general.aup`）与 `?page=diagnostics`（`.aup/pages/admin/diagnostics.aup`）**两页**，admin + guest 两态。
- **不走查**：Dev 本轮新建的 `orders` / `ledger` 页。**本报告没有对它们做任何 DOM 走查**；§6 的骨架建议只依据 spec §15.7 / REQ-017 的 CLI 口径与 UI 标准推导，另有两处**纯静态 `grep`** 命中（§6.4 末尾，已注明只读源码、不作走查结论）。
- **不点击任何写操作**：只读 `getComputedStyle` / 几何 API / DOM 属性 / 一处**临时 DOM 实验**（给既有节点加 `style.fontFamily` 后立即还原，见 P-05）；不触发 Save / On / Off / 创建 / 登录。
- 不改 `.aup/**`、`.web/**`、`scripts/**`、`world/**`、`blocklet.yaml`、`dist/**`、spec、checklist、`arc-contracts.md`；**没有改 UI 标准的口径/期望值**。

### 0.2 方法（与 UI-007 / UI-009 / UI-010 同范式）

| 项 | 取值 |
| --- | --- |
| 浏览器 | 共享调试 Chrome `:9333`（Chrome 153.0.8010.54），CDP |
| 视口 | `Emulation.setDeviceMetricsOverride` **1803×908**，`deviceScaleFactor: 1` |
| 等待 | 每次 `Page.navigate` 后 **3500 ms**；DOM 实验后立即读 computed |
| 单标签页 | admin 扫描**复用同一个既有 page target**（`Page.navigate` 换页）；guest 用 `Target.createBrowserContext` + `Target.createTarget` 隔离上下文，**结束 `Target.disposeBrowserContext` 关闭** |
| 钉住标签页 | 探针支持 `--target <targetId>`；本报告全部数据来自 `1F2B2046662C9362703896A73C794B45`（admin）/ 其隔离上下文（guest） |
| 证据分层 | **浏览器实测** / **静态复核** / **受限未验证** 三类，逐条标注 |
| 判定三值 | `实现偏差` / `平台差异` / `无偏差`（无“待定”；不确定的单列 §8） |

### 0.3 快照与并发（A9 要求，诚实登记）

```text
$ git rev-parse --short HEAD                      → 9a06261
$ ls docs/team/.gate-lock                         → No such file or directory
$ node scripts/arcblog-console-nav.mjs --check     → {"ok":true,"action":"check","pages":21}
$ node -e "import('./scripts/console-nav.mjs')…"  → sections=21  [... "ledger","factory","general","diagnostics"]
$ stat -f '%Sm %N' .aup/pages/admin/general.aup .aup/pages/admin/diagnostics.aup scripts/console-nav.mjs
  2026-09-28 12:18:29 .aup/pages/admin/general.aup
  2026-09-28 12:18:29 .aup/pages/admin/diagnostics.aup
  2026-09-28 12:18:21 scripts/console-nav.mjs
$ diff -r .aup dist/.aup                          → 0 行（干净）
$ arc dsl validate --json | tail -3                → "issues": []
$ npm test | tail -4                               → pass 28 / fail 0（1010.9 ms，fast tier passed）
$ arc dsl generate --check | tail -3               → Would generate 0 file(s) (dry-run) — nothing to change
```

**并发事实（必须与结论一起读）**

1. **Dev（`task-45`）在本轮中途落地了 `console-nav` 19→21**：`scripts/console-nav.mjs` 12:18:21 重写，**21 个控制台页面文件的侧栏块被生成器整体重写**（`general.aup` / `diagnostics.aup` 各 **+8 行**，`git diff --numstat` = `8 0`；`grep -nE 'nav-(orders|ledger)'` 命中 `general.aup:120,132`，**正文/结构零改动**），`dist/**` 12:31:39 重新构建。
2. 因此本报告的**侧栏相关量采于 `pages=21`**（12:2x–12:3x，Dev 的 build 已同步）：
   `sidebar rows=23`（21 导航 + 2 页脚链接）、`scrollHeight 1021 - clientHeight 860 = 161`、`footerReachable=true`。
   对照：**同一探针在 `pages=19` 时**测得 rows=21 / overflow=91 / footerReachable=true（12:1x）。**注意**：那一次的 `raw/UI-011-admin.json` 已被 `pages=21` 的复采覆盖，该值只保留在本轮记录中，**请以 `pages=21` 的落盘值为准**；两次数值之差与“新增 2 节 × 35px”吻合（91+70=161）。
   **正文级量（卡片/字号/间距/圆角/命中区/对比度）两次扫描一致**（侧栏变更不影响内容列）。
3. **共享浏览器有第二个写者**（另一名 teammate 的标签页，曾观察到 `?page=orders` / `?page=ledger`）：
   - 一次临时探针按 `/json/list` 中“第一个 page target”附着，**误挂到别人的标签页**（落地 URL 为 `?page=ledger&locale=zh`），该次输出**已全部丢弃**；此后所有探针改为 `--target` 显式钉住，`raw/UI-011-cdp-probes.txt` 头部已记录此事。
   - 我的标签页也**被外部导航过两次**（一次落到 `/`）——两次都发生在**未取数**的空档；凡取数run 都在 `landed` 行断言了落地 URL 与 `active=<页名>`，`raw/UI-011-admin.json` 的 `steps[].sameDeepLink` 两页均为 `true`。
   - 结论：**不把任何未断言的读数写进本报告**；`?page=` 被静默归一化的旧观察（UI-007 §7.3）本轮**没有受控复现**，故不作定性（§8）。
4. **标签页计数自证**：admin sweep `before=1 during=1 afterProbe=1 afterClose=1`；guest `before=1 during=2 afterProbe=2 afterClose=1`（`during=2` 的那 1 个是我为 guest 态新建的隔离 target，**已关闭**）。UI 未留下任何自有 target。

### 0.4 术语

| 记号 | 含义 |
| --- | --- |
| **期望值** | `docs/ArcBlog-admin-ui-design.md` 写下的取值（本轮**未改**） |
| **实测值** | 下面 CDP 表达式在 1803×908 下 `getComputedStyle` / 几何 API 的结果，原始字符串见 `raw/**` |
| **实现偏差** | 归 ArcBlog 侧、可提 Dev 改 |
| **平台差异** | 平台组件/运行期样式产生，控制台内联样式改不动（附平台侧证据） |

---

## 1. 主表：实现偏差（**唯一 1 条**）

列固定为 `# | 页面 | 选择器 | 属性 | 标准期望（§x + 现取行号）| 实测 computed | 偏差 | 判定`。

| # | 页面 | 选择器 | 属性 | 标准期望（§x + 现取行号） | 实测 computed | 偏差 | 判定 |
| -- | ---- | ------ | ---- | ------------------------- | ------------- | ---- | ---- |
| **D-01** | `?page=general` | 3× `button.aup-action`（文本 `Save`，`variant=secondary size=sm`）**的父级** `view[style*="display:flex"]`（DSL `row gap=xs`） | `height`（由 flex `align-items:normal`→stretch 派生） | §4.3 L351「`size=sm` 档 `padding: 5px 12px`、字号 13.6px。**同屏只允许这两档**……判定看两档的 `padding`/字号取值与**同屏一致性**，不看某个固定像素」；同族机制见 §4.3 L352（宽度不得被拉伸） | 按钮 `h = 60.39px / 62.39px / 62.39px`；同一页面其余 8 个 `size=sm` 按钮 `h = 29px`（zh：31px）；按钮自身 `padding 5px 12px`、`font-size 13.6px`、`border-radius 8px` | **+31.39 / +33.39px（= sm 档 29px 的 2.08× / 2.15×）**；行高由同级 `.aup-input` 字段外壳（label+控件 = 24.39 + 36/38）决定，按钮被 stretch 到整行高 | **实现偏差（P2）** |

**影响面**：`?page=general` **3 处**（`.aup/pages/admin/general.aup:171,180,189` 三个 `row gap=xs { input…; action… }`）。全仓库同型模式扫描（静态复核）：`grep -rn "row gap=xs {" .aup/pages/*/*.aup | wc -l` → `6`，逐块检查后**只有 `general.aup` 的三个块同时含 `input` + `action`**（`policy.aup` 的块不含该组合），即**影响面 = 1 页 3 处**。zh 同型（60/62 vs 31）。

**复现（浏览器实测，admin / 1803×908）**

```js
// node docs/team/design/raw/UI-011-probe.mjs --target <id> --admin   →  raw/UI-011-admin.json
// 或单条：见 raw/UI-011-cdp-probes.txt「saveButtons」段
(() => { const gs=e=>getComputedStyle(e), box=e=>{const r=e.getBoundingClientRect();return {w:+r.width.toFixed(2),h:+r.height.toFixed(2)}};
  const b=[...document.querySelectorAll('button,a.aup-action')].find(x=>x.innerText.trim()==='Save');
  return { btn: box(b), pad: gs(b).padding, fs: gs(b).fontSize, alignSelf: gs(b).alignSelf,
           row: box(b.parentElement), rowAlign: gs(b.parentElement).alignItems,
           siblings: [...b.parentElement.children].map(c=>({tag:c.tagName, cls:c.className, box: box(c)})) }; })()
```

真实输出（`raw/UI-011-cdp-probes.txt`）：

```json
{"btn":{"w":59.13,"h":60.39,"y":394.5,"bottom":454.89},"pad":"5px 12px","fs":"13.6px","alignSelf":"auto",
 "row":{"w":698.28,"h":60.39,"y":394.5,"bottom":454.89},"rowDisplay":"flex","rowAlign":"normal",
 "rowChildren":[{"tag":"DIV","cls":"aup-input","box":{"w":634.16,"h":60.39}},
                {"tag":"BUTTON","cls":"aup-action","box":{"w":59.13,"h":60.39}}]}
```

**最小修复形态（只描述，未实施）**：在 `general.aup:171,180,189` 的三个行上收住交叉轴——`row gap=xs cross=start {`（行内所有子项顶端对齐），或给 `:173,:182,:191` 三个 `action` 加 `style={alignSelf: "flex-start"}`（保顶端对齐）／`"flex-end"`（与控件底边对齐，视觉上更贴近原意）。**验收断言**：`Save` 按钮 `h` 回到 sm 档（en 29px / zh 31px），且与输入控件同屏一致；`padding`/`font-size` 不变。

> **更正（UI-012，2026-09-28，实测）**：上文第二条候选（给 `action` 加 `style={alignSelf: …}`）**不可用**——`alignSelf` 被 action 的 style 转发白名单**静默丢弃**（与 `arc-contracts.md` §29.6 的 `minHeight` 同族）。证据：`.aup/pages/admin/posts.aup:164` 写了 `style={borderRadius: …, alignSelf: flex-start}`，运行期该按钮 `getAttribute('style') === "border-radius: var(--radius-md, 8px);"`、computed `align-self: auto`、宽度被拉伸到 **1440.56px**（卡片内容宽）。**唯一可用的修法是外层包 `row cross=start` / 给父 `row` 加 `cross=center`**（UI-012 §2 UI-012-09/UI-012-10）。

**为何不算“标准没写”**：§4.3 L354 已为**行内 `itemStyle=card`** 记录过同族机制（“行必须 `cross=start`，否则按钮被拉伸到卡片等高（实测 140px）”），L352 记录的是**宽度**被卡片拉伸；本条是**高度被同级字段外壳拉伸**——同一根因、同一修法，只是首次在 `row gap=xs` 的字段行上出现。**建议 Dev 顺手把这条机制写进 §4.3（属加条目，不是改口径 → 本轮 UI 只登记，见 §7 D-06）。**

---

## 2. 交付面逐项对照（标准期望 vs computed 实测）

> 全部为 **admin 会话 / 1803×908 / lang=en / tone·palette·mode = editorial·natural·light**；每行都有 `raw/UI-011-admin.json` 的原始字段与 §1 的复现命令支撑。

### 2.1 排版

| # | 维度 | 标准期望（§x 现取行号） | `general` 实测 | `diagnostics` 实测 | 判定 |
| -- | ---- | ---------------------- | -------------- | ------------------ | ---- |
| T1 | 页面标题 `h2` 字号 | §3.4 L297 `var(--type-subheading)` = **17px** | `17px`（`line-height 21.25px`） | `17px` | 无偏差 |
| T2 | 卡片内 `h3` 字号 | §3.4 L298 `var(--type-body)` = **15px** | 可见 `h3` 字号集合 = `{"15px"}`（采样 17 个；`afs-list` 行随渲染时机 ±1，**判定看集合不看个数**——同源原始值见 `raw/UI-011-admin.json` 的 `headings`） | 同，集合 `{"15px"}`（采样 24 个） | 无偏差（BUG-024 未回归） |
| T3 | `h3` 默认回落 | 运行期默认 17px（UI-007 V9） | 无 17px `h3` | 无 17px `h3` | 无偏差（R11F 已收口） |
| T4 | 页面标题 `h2` 数量 | §3.4「每页一个」 | 1 | 1 | 无偏差 |
| T5 | 正文/说明字号 | §3.3 L272–275 刻度；`scale=sm` → `--type-caption` 13px | 说明句 15px（默认正文）/ 12.8px（`scale=sm` 平台值）/ 13px | 同 | 无偏差 |
| T6 | 数字/哈希等宽 | §3.4「数字、DID、哈希、金额使用等宽」 | 本页无 DID/哈希/金额 | 命令行的 `monospace: true` **不产生等宽**（P-05） | 平台差异（P-05） |

### 2.2 间距 / 圆角 / 卡片

| # | 维度 | 标准期望（行号） | `general` | `diagnostics` | 判定 |
| -- | ---- | --------------- | --------- | ------------- | ---- |
| S1 | 内容卡 `padding` | §3.3 L283/L285 `14px` | 4/4 张卡 `14px` | 9/9 张卡 `14px` | 无偏差 |
| S2 | 卡片内 `rowGap` | §3.3 L283 `gap=sm` = `10px` | `10px` | `10px` | 无偏差 |
| S3 | 内容列滚动容器 `rowGap` | §3.3 L285 内容区滚动间隔 `gap=sm` = `10px` | `10px` | `10px` | 无偏差 |
| S4 | 内容列上下 `padding` | §3.3 L285 `14px` | `14px 0px`（外层承载 860px 高） | `14px 0px` | 无偏差 |
| S5 | 外层承载与滚动容器之间的间隔 | 标准未写（本文档只约束滚动容器） | `20px`（= `gap=md`，仓库内 21 页统一形制，非本页新引入） | `20px` | 无偏差（登记为观察项，不建议改） |
| S6 | 卡片圆角 | §3.2 L264 `var(--radius-lg, 10px)` | `10px` | `10px` | 无偏差 |
| S7 | 卡片描边 / 阴影 / 底色 | §3.3 L283 `1px var(--color-border)` + `boxShadow: none` + `var(--card-bg)` | `1px solid rgba(0,0,0,.08)` / `none` / `rgb(240,239,236)` | 同 | 无偏差 |
| S8 | 双列卡片网格 | §3.3 L283「网格 gap 14px」 | `728.281px 728.281px`、`gap 14px`、`alignItems start`、4 子项 | 5 子项同形制 | 无偏差 |
| S9 | 列表行内边距 / 分隔线 | §3.3 L279 `padding: 8px 0` + 1px `var(--color-border)` | `.aup-list-template-item` → `8px 0` / `border-bottom 1px solid` / `rowGap 5px`(xs) | 同 | 无偏差 |
| S10 | 卡片子项不压缩 | §2.5 L165 直接子项必须 `flexShrink: 0` | 源码 4 张卡均 `flexShrink: 0`（静态复核） | 9 张卡均 `flexShrink: 0` | 无偏差 |
| S11 | 刻度外裸数值 | §3.3 L291 禁止 | 出现的是 `padding: "0 32px 0 0"` / `marginBottom: "-52px"` / `height: "calc(100vh - 48px)"` / `width: "100vw"` —— 即 `arc-contracts` §24 的**全出血外壳配方**，21 页统一，非卡片/排版刻度 | 同 | 无偏差（登记观察项） |

### 2.3 按钮层级与命中区

| # | 维度 | 标准期望（行号） | `general` | `diagnostics` | 判定 |
| -- | ---- | --------------- | --------- | ------------- | ---- |
| B1 | 每屏 `primary` 数 | §4.3 L353「每屏一个 `primary`」 | admin **0**；guest gate CTA **1** | admin **0**；guest gate CTA **1** | 无偏差 |
| B2 | 按钮圆角 | §4.3 L350 `var(--radius-md, 8px)`，必须内联覆盖 | 内容区 **全 8px** | 内容区**无页面按钮**（仅平台复制键 3px → P-04） | 无偏差 |
| B3 | 尺寸档 | §4.3 L351 只有默认档与 `size=sm` | `padding 5px 12px` / `13.6px`（sm 档）；**但 3 只 `Save` 高度 60.39–62.39px → D-01** | 不适用 | **实现偏差 D-01** |
| B4 | 宽度不得被拉伸 | §4.3 L352 | `Save 59.13px` / `On 46.53` / `Off 47.66` / `Create basics 120.53` —— 全为内容宽 | — | 无偏差 |
| B5 | gate CTA 不得被拉伸（R11F V1 判据） | §4.3 L352 + UI-007 §2 V1 | guest：卡片内容宽 `1094px`，CTA `175.39×38`，`border-radius 8px`，`padding 8px 16px`（**不是 1094**） | 同 | 无偏差（V1 修复在新页上成立） |
| B6 | 可点击控件命中区 ≥24×24 | §9 L494（WCAG 2.5.8） | 内容区 **0 个** <24；`input/select` `634.16×36`、`634.16×38`；侧栏 23 行全 `269.44×34`、页脚链接均 ≥24 | 内容区 18 个 `.aup-copy-btn` **18×18 → P-04**；其余 0 | 平台差异（P-04） |
| B7 | `data-kind=back` 平台配方覆盖 | §9 L494 / L577 | 本页无 `data-kind=back` | 同 | 不适用 |
| B8 | 行内按钮不被拉伸到卡片等高 | §4.3 L354 | 本页无 `itemStyle=card` 行 | 同 | 不适用 |

### 2.4 骨架 / 滚动 / 点击去向

| # | 维度 | 标准期望（行号） | `general` | `diagnostics` | 判定 |
| -- | ---- | --------------- | --------- | ------------- | ---- |
| L1 | 无双滚动条 | §2.5 L167 | `documentElement.scrollHeight === clientHeight`（908/908），内容列**恰好 1 个**滚动容器（`overflowY: auto`） | 同（908/908, 1 个） | 无偏差 |
| L2 | 无横向滚动 | §2.5 L155 | `scrollWidth === clientWidth`（1803/1803） | 同 | 无偏差 |
| L3 | `scrollWidth > clientWidth` 元素 | 预期 100vw 逃逸（§24 / UI-007 §3.3） | 2 处（`general-view-1` 1502/1200、`general-view-1-view-1` 1470/1136） | 2 处同型 | 无偏差（预期） |
| L4 | 滚动只发生在内容列 | §2.5 L155–157 | 内容列 `clientH 759 / scrollH 1793`（1793>759 → 唯一滚动源）；外壳不滚 | `clientH 737 / scrollH 4291` | 无偏差 |
| L5 | 侧栏一屏 / 页脚可达 | §2.5 L169 + L481（D24 口径） | 21 节：`clientH 860 / scrollH 1021 → 溢出 161px`，**滚动到底后页脚块底 907.5 ≤ 908 → `footerReachable=true`** | 同 | 无偏差（D24 达标；溢出本身是 ≥18 节的已裁定形态） |
| L6 | 当前菜单行 | §2.3 + `arc-contracts` §23 | 恰 **1** 个 `[data-active="true"]` + `aria-current="page"`；`bg rgba(42,110,0,.08)` / `color rgb(42,110,0)` / `padding 8px 20px 8px 32px` / `269.44×34` / 文本 `General` | 同，文本 `Diagnostics` | 无偏差 |
| L7 | 侧栏行内边距一致 | §2.1（V1.6 实测口径） | 当前行与未选中行 `padding` **均为** `8px 20px 8px 32px` | 同 | 无偏差 |
| L8 | 点击去向等价断言 | §2.6 L215 + §9 L510：`candidates ≥ 1 && total === 0` | `candidates: 1, linksWithoutTarget: 0` | 同 | 无偏差 |
| L9 | 页面根 `overflow !== hidden` | §24 | 源码 `view gap=lg style={height: "100vh", overflow: visible}`（`.aup/pages/admin/general.aup:49`） | `diagnostics.aup:70` 同 | 无偏差（静态复核） |
| L10 | 侧栏生成器不漂移 | §9 L480 | `console-nav --check` → `pages: 21`，`ok: true` | 同 | 无偏差 |

### 2.5 权限 / 状态 / 数据 / i18n

| # | 维度 | 标准期望（行号） | 实测（admin + guest） | 判定 |
| -- | ---- | --------------- | --------------------- | ---- |
| P1 | 匿名只见登录卡 | §6 / §9 L487 | guest：每页**恰好 1 张卡**（gate，`padding 20px` = §3.3 L287 豁免）、侧栏 **0 行**、内容列滚动容器 **0 个**、`[data-active]` **0** | 无偏差 |
| P2 | 无数据泄漏 | §9 L487 | guest `document.body.innerText` **不含** `Site basics / Stored records / Instance switches / What belongs here / Last self-check / Every check / Storage & index / Permissions (platform boundary) / First-line troubleshooting / Background work`（逐串断言，全部 `false`） | 无偏差 |
| P3 | 空状态有引导 | §4.4 L375「一句现状 + 一句价值 + 一个动作」 | `diagnostics` 快照/checks 卡各带常驻指引句（“If this list is empty, no snapshot exists yet — run the record command above. Empty is not the same as ‘all checks passed’.”，中英各 1 条）+ 可复制命令；**运行期英文兜底 `No items to display` 未出现**（`runtimeEmptyEnglish: false`，两页） | 无偏差（**空态本身不可观察**，见 §8 R-02） |
| P4 | 状态双编码 | §4.1 L257 + L320 + L326/327（BUG-005 路径 B，L-R14-4） | `diagnostics` checks 行 = **本地化中性标签 + 原始值可见**：`severity: warn · ok: true`（raw 值 `warn`/`true` 逐行可见）+ `detail` 具体原因 + 常驻说明；`type/status` 同类 | 无偏差（**无“色点”** → P-06 平台受限） |
| P5 | 不同真实状态不得同一句话 | §4.1 L327② | 9 行 `severity` ∈ {`error`,`warn`}、`ok` ∈ {`true`,`false`} 逐行呈现，未见合并断言 | 无偏差（静态复核） |
| P6 | DID/哈希中间截断 + 可复制 | §5.1 L404 | 两页 `[data-format="did"]` 元素 **0**（本页无 DID），不适用 | 不适用 |
| P7 | 时间相对 + 绝对（悬停） | §5.3 L418 | `diagnostics` 16 个 `.aup-time`：可见文本 `1 hour ago`（相对），`title="2026年9月28日 10:54"`（**悬停绝对**），`data-datetime="2026-09-28T02:54:45.432Z"` | 无偏差（但 title 在 `lang=en` 下仍是中文格式 → P-08） |
| P8 | 金额带符号 | §5.2 L409–411 | 两页无金额 | 不适用 |
| P9 | i18n 中英布局成立 | §9 L489 | zh：`lang=zh`，gate 标题「设置」、说明中文；卡片仍为 2 列 `728/728`、`h2 17px`、`h3 15px`、按钮 `53px` 内容宽；`rawKeyLeak`（`$t(` / 裸 key）→ **false**；tone/palette 一致 | 无偏差 |
| P10 | 无硬编码颜色/字号 | §9 L483 | **静态复核**：两页 `#hex|rgb(|hsl(` = **0**；`fontSize: "<数字>"` = **0**；`fontSize` 一律走 `var(--type-*)`；`borderRadius` 数字字面量 23 处/页，**全部是生成侧栏的 `borderRadius: "0"`**（21 页统一，非本页手写） | 无偏差 |
| P11 | gate 卡豁免 20px | §3.3 L287（D4） | guest gate `padding: 20px`（两页） | 无偏差（与豁免一致） |
| P12 | 破坏性按钮对比度 | §9 L493 | 两页内容区 `[data-variant=destructive]` **0 个** | 不适用（见 §8 R-04） |

### 2.6 `diagnostics` 专有必测项（REQ-018 A6.2）

| # | 判据 | 实测 | 判定 |
| -- | ---- | ---- | ---- |
| DG1 | 诚实说明卡存在 | `h3 "How to read this page"` + `honesty-desc`（含“本页不执行任何命令 / no snapshot = 尚未运行”） | 无偏差 |
| DG2 | 零写接线 | **静态复核**：`grep -c 'events={'` → **0**；`grep -c 'exec:'` → **0**；`grep -cE 'exec\|events='` → **4**，逐条核对**全部落在 i18n 文案里**（`:4` “executes nothing”、`:9` “execute server-side code”、`:49`/`:53` 的 `arc afs exec …` 命令字符串） | 无偏差 |
| DG3 | 复制按钮命中区 | 18 个 `.aup-copy-btn`，`18×18`、`radius 3px`、`font 11.52px Arial`、`title="Copy"`、`padding 0px` → **P-04** | 平台差异 |
| DG4 | 无快照占位可观察 | 实例**已有** `config/diagnostics/summary/last-run.json`（`ranAt 2026-09-28T02:54:45.432Z`），卡片非空 → 空态**不可观察**；页面常驻占位文案已存在（P3） | **受限未验证**（§8 R-02） |
| DG5 | checks 行数 == `doctor` 的 `checks.length`（不写死件数） | 页面 checks 行 = **9**；`summary.count` = **9**；`config/diagnostics/checks` AFS 条目 = **9**；`node scripts/arcblog-doctor.mjs --help` → “**Checks (9 — this list is the authoritative set)**” | 无偏差 |
| DG6 | 平台 prop `hideWhenEmpty` 行为 | `failed` 为**空数组** `[]` 时，`Failed (severity error)` 行**仍可见并显示 `[]`**（`hideWhenEmpty: true` 未生效） | 平台差异（**P-07**；本条即 A2.4 要求的“故意的期望外值”，证明采集不是只挑通过项） |

---

## 3. 平台差异表（**8 条**，每条附平台侧证据，均**不改** `.aup` / `.web` / 令牌）

> 与 §1 的交叉计数：**平台差异 8 条 == 本节 8 行**；主表（实现偏差）内**不含**任何平台配方项。

| # | 页面 | 现象（实测） | 平台侧证据（CSSOM / 已登记事实） | 为何不改 |
| -- | ---- | ------------ | ------------------------------- | -------- |
| **P-01** | `diagnostics`（8 个 `key-value-list`，29 行） | `.aup-kv-row` → `display: grid`、`grid-template-columns: 403.344px 1021.22px`（= `minmax(140px,28%) 1fr`）、`gap: 16px`、`padding: 10px 0`、`align-items: center`、`border-bottom: 1px solid var(--color-border)`；`.aup-kv-label` 12px `--color-dim`、`.aup-kv-value` 13px | 平台 CSSOM 原文：`.aup-kv [data-kv-row]{display:grid;grid-template-columns:minmax(140px,28%) 1fr;gap:16px;padding:10px 0;border-bottom:1px solid var(--color-border);align-items:center}`（`aup-app.*.css`，本轮从页面 `fetch` 取回） | `16px` / `10px` 都不在 §3.3 刻度上，但这是平台原语的内部配方，页面内联 `style` 管不到；改它只能覆盖平台类名（UI-007 §3.2 已裁定不做） |
| **P-02** | 两页 | 卡片/列表的**行高、字体度量**：同 `font-size: 13.6px` 的 sm 按钮 en 29px / zh 31px；页面标题 `line-height: 21.25px`；说明句 `line-height: 22.5px` | §4.3 L351 已写入该口径（D2：高度由 `line-height: normal` + 字体度量派生，**不看固定像素**）；UI-007 §3.5 同结论 | 标准已承认度量派生，页面无法“固定高度” |
| **P-03** | 两页（body/html/header chrome） | 可见字号集合里出现 `16px`（`html`/`body`/`.aup-app-header-title`）、`13.3333px`（用户菜单触发器）、`12px`/`10px`（header 图标）、`Arial`/`"SF Mono"` | 全部落在 `.aup-app-header*` / `html` / `body`（平台 chrome），**页面内容区 0 处**；`font-outliers` 原始清单见 `raw/UI-011-admin.json` 的 `fontOutliers` | 平台 chrome，不属页面 |
| **P-04** | `diagnostics` | 18 个 `.aup-copy-btn` 命中区 **18×18 < 24×24**（§9 L494 / WCAG 2.5.8）；`radius 3px`、`font 11.52px Arial`、`padding 0px`、`title="Copy"`（英文，zh 页面上也是 `Copy`） | 仓库内 `grep -rn "aup-copy-btn" .aup .web scripts` → **0 命中**（纯平台渲染）；UI-007 §3.2 已登记同一事实 | §9 末条的平台类名覆盖已明确不做；**建议记入 `docs/arc-contracts.md`（Lead 写范围）**，不在页面造覆盖 |
| **P-05** | `diagnostics` | `key-value-list … monospace: true` **不产生等宽**：18 个 `.aup-kv-mono` 行落 DOM，但 `.aup-kv-value` computed `font-family` = `Sora`（13px）；命令行仍是比例字体 | **强证据**：平台两份样式表 `aup-core.*.css`(268,506B) 与 `aup-app.*.css`(179,865B) 中 `kv-mono` 出现次数 **均为 0**；CSSOM 里匹配 `/kv-mono/` 的规则数 **0**；`:root --font-mono` = `"JetBrains Mono", monospace`（变量有值但没人用）。**替代写法已验证**：给节点内联 `style.fontFamily="monospace"` → computed 立即变 `monospace`（`allowlistAcceptsFontFamily: true`，实验后已还原） | `.aup-kv-value` 是平台内部类，页面无法覆盖；**但页面可为命令另选承载**（内联 `fontFamily`），故列为对新页的设计约束（§6.3） |
| **P-06** | `diagnostics` | checks 行状态**只有文字、没有色点**：`severity: error · ok: true`（4 行）、`severity: warn · ok: false`（3 行）… 全部同色同形；§4.1 L320/L326 要求「色点 + 文字」双编码 | §4.1 L323–328 已明确平台限制：`$t()` 的 key 必须编译期常量，**运行期拼串原样渲染**（`arc-contracts` §28.8），`visible` 只支持同步 `$session.*` 表达式（§28.1）→ **按记录值换色/换点不可能**；`intents` 实测只出现 `muted`（两页 0 处语义色文字） | 页面已给出“本地化标签 + 原始值可见 + 常驻说明”这一平台上可达的最强形态；**补色点需要平台支持**（登记候选，见 §7 D-07） |
| **P-07** | `diagnostics` | `hideWhenEmpty: true` 对**空数组**无效：`Failed (severity error)` 显示 `[]`；而 `Warnings`（非空数组）正常显示 `[ "space-layout", … ]` | UI-007 §2 / `arc-contracts` 已登记「`hideWhenEmpty` 对空数组不生效」；本轮给出**可复现的当前实例证据**（`summary.last-run.json` 的 `failed: []` + DOM 行文本，`raw/UI-011-cdp-probes.txt`） | 页面无法按值隐藏（同上 §28.1/§28.8 限制）；`[]` 反而比“静默隐藏”更诚实，**不改** |
| **P-08** | `diagnostics`（en 会话） | 时间悬停提示是**中文格式**：页面 `lang=en`，`title="2026年9月28日 10:54"` | 平台 `.aup-time.aup-time-display` 自带 `title` + `data-datetime`（ISO），页面只传 `timeMode=relative` | 平台渲染的本地化格式，页面不可控；**登记**（§7 D-08 建议） |

---

## 4. 对比度（WCAG 2.1，alpha 先合成）

**派生计算**：`node docs/team/design/raw/UI-011-contrast.mjs` → `raw/UI-011-contrast-output.txt`（纯 Node，不连浏览器）。

**元素级实测（两页）**

| 元素 | 实测 | 对比度 | ≥4.5:1 | 判定 |
| ---- | ---- | -----: | -----: | ---- |
| 页面标题 `h2` on `--color-bg` | `rgb(26,26,31)` on `rgb(250,250,248)` | **16.59** | ✅ | 无偏差 |
| 卡片标题 `h3` on `--card-bg` | `rgb(26,26,31)` on `rgb(240,239,236)` | **15.08** | ✅ | 无偏差 |
| 卡片内 `intent=muted` 说明句（12.8/13px，多句） | `rgb(107,107,120)` on `--card-bg` | **4.57** | ✅（+0.07） | 无偏差（**贴边，登记为风险**） |
| 侧栏分组标题 `intent=muted` on `--color-bg` | 同上 | **5.02** | ✅ | 无偏差 |

**令牌矩阵（`:root` 实测 12 个令牌，21 组前景/底）**：除下列 2 组外全部 ≥4.5。

| 组合 | 对比度 | 判定 |
| ---- | -----: | ---- |
| `--color-info` #2563eb on `--card-bg` #f0efec | **4.49** | ❌（UI-007 §2 V2 的既有事实；**本轮两页 `[data-intent]` 只出现 `muted`，语义色文字 0 处 → 无实际违规**） |
| `--color-warning` #a16207 on `--card-bg` #f0efec | **4.28** | ❌（**UI-007 §4 未登记过**：当时只算了 warning on **页面底** 4.71；本轮补齐卡片底。同样**两页 0 处使用**） |

**结论**：两页文字令牌全部达标；两条 <4.5 的组合都是“**把语义色（info/warning）当卡片上的正文**”，本页未用。**`--color-dim` on `--card-bg` = 4.57（仅 +0.07）**：任何 tone/palette 调整都可能压破，建议列入主题回归项（与 UI-007 §4 结论一致，本轮复现）。**未因平台差异改动任何 `.aup` / `.web` / 令牌**（本轮 UI 未改源码）。

---

## 5. 原始数据与复现

### 5.1 落盘清单（A2 要求）

| 文件 | 内容 | 条目量 |
| ---- | ---- | ------ |
| `raw/UI-011-admin.json` | 两页 admin 全量探针（tokens / 卡片 / 标题 / 按钮逐只 / 命中区 / 网格 / 列表行 / 侧栏 / 对比目标 / 字体离群 / mono 清单 / gate） | `general` 与 `diagnostics` 各 **60+ 字段**（远超 A2 要求的 ≥10 条/页） |
| `raw/UI-011-guest.json` | 两页无 cookie 访客（zh）：gate 几何、CTA、泄漏断言、滚动/骨架 | 同上 |
| `raw/UI-011-cdp-probes.txt` | 临时探针逐条命令 + 原始输出（`saveButtons` / `aup-kv` 行文本 / checks 行 / 对比度 / CSSOM+样式表 `kv-mono` 计数 / `time` 属性 / 复制键 / `fontFamily` 白名单实验 / `hideWhenEmpty` 负例） | 330 行 |
| `raw/UI-011-contrast.mjs` + `raw/UI-011-contrast-output.txt` | 派生对比度脚本与输出（21 组令牌组合 + 元素级 + 参照值） | 60 行输出 |
| `raw/UI-011-probe.mjs` | 可复跑探针（`--admin|--guest --target <id> --out <path>`） | — |

**每条原始条目的字段形状**：`{page, selector, property, computed, expected, standard}` 语义均已包含（`computed` 为浏览器原始字符串，如 `"15px"`、`"rgb(26, 26, 31)"`、`"10px"`、`"14px"`）。

**负例（A2.4，故意的期望外值）**：`Failed (severity error)` = `[]`（`hideWhenEmpty: true` 未生效，P-07）；`.aup-copy-btn` 18×18 < 24×24（P-04）；`Save` 60.39px（D-01）。

### 5.2 标准行号（**本轮 `grep -n` 现取，未沿用旧报告**）

```text
$ grep -n '<锚点>' docs/ArcBlog-admin-ui-design.md
165:* **滚动区子项不得压缩**：内容列滚动容器的直接子项必须 `flexShrink: 0`…
167:* **滚动条只有一条**：控制台页面禁止出现页面级纵向滚动条与内容区滚动条并存的"双滚动条"…
169:* **侧边栏不独立滚动（默认；节数 ≥ 18 时例外…**：…默认一屏可见；**节数 ≥ 18 时…侧栏自身滚动是可接受形态**…
215:**等价断言（判定以此为准）——只针对内容列：`candidates` 必须 ≥ 1，且 `total` 必须为 `0`**…（§2.6）
256:* **一个页面最多出现一个语义色焦点**——满页红色等于没有红色。
257:* 状态用"色点 + 文字"双编码（`● Online`），不只用颜色（色盲友好）。
264:卡片 / 面板    var(--radius-lg, 10px)
272:xs    4px     图标与文字之间
279:**列表行样式（审计后固化）**：…上下内边距 `8px 0`…行标题用 `h3` + `fontSize: var(--type-body)`(15px)…
283:**卡片样式（审计后固化）**：`padding: 14px`、`gap=sm`(10px)、`radius: var(--radius-lg)`(10px)…
285:**控制台精修取值**：卡片 `padding: 14px` + `gap=sm`(10px)、内容区滚动间隔 `gap=sm`(10px)…
287:**登录门（gate）卡豁免（Lead D4 裁定…**：…保持现状 **`padding: 20px`**…
289:**平台原语 `auto-surface`（`?page=appearance`）不受本节与 §3.4 管辖（免责）**…
291:禁止出现刻度外的裸数值（如 `margin: 13px`）。
297:| `h2` | 页面标题，每页一个 | `fontSize: var(--type-subheading)`（17px…） |
298:| `h2` / `h3`（卡片内） | 卡片标题、区块标题 | `fontSize: var(--type-body)`（15px） |
305:* **D6 判据（Round 13 补齐…**：**卡片内的 `h2` 若承担该页唯一可见标题 → 按页面标题（17px…）**
320:* 状态点与文字必须同时出现（双编码）。
326:* **降级口径（诚实优先于全本地化）**：一行状态 = **本地化中性标签** + **原始状态值以可见文本呈现** + **色点**…
327:* **三条硬边界**：① **不得**只把真实值放进 `title`…② **不得**把**不同真实状态**断言成**同一句话**；③ 列表后必须有**常驻 dim 说明**…
350:| 圆角 | 全部 `var(--radius-md, 8px)`。运行时默认不一致（`primary` 8px、`secondary`/`ghost` 32px），必须内联覆盖 |
351:| 尺寸档 | 默认档 `padding: 8px 16px`、字号 14.4px；`size=sm` 档 `padding: 5px 12px`、字号 13.6px。同屏只允许这两档。**高度不写死**… |
352:| 宽度 | **内容宽**，不得被容器拉伸。…必须包一层 `row cross=start` |
353:| 层级 | 每屏一个 `primary`；次级用 `secondary`（accent 淡底）或 `ghost`；破坏性操作 `destructive` |
354:| 列表行内按钮 | 若行是 `layout=grid itemStyle=card`，行必须 `cross=start`，否则按钮被拉伸到卡片等高（实测 140px） |
375:公式：**一句现状 + 一句价值 + 一个动作**。空状态永远给出下一步。
381:* 失败提示三要素：**发生了什么 + 为什么 + 怎么办**（带重试或跳转）。
404:* 永远**中间截断**（保留头尾），配一键复制；完整值悬停可见。
409–411（§5.2 金额）：金额与资产符号成对出现，缺一不可…
416:### 5.3 时间
418:* 默认相对时间（`time mode=display timeMode=relative`：「3 分钟前」），悬停/详情页显示绝对时间。
480:□ 骨架：侧边栏由 console-nav 生成，--check 通过
481:□ 布局：宽高 100% 流式…节数 ≥ 18 时允许侧栏自身滚动（§2.5），但**页脚…必须能通过该滚动到达**…
483:□ Token：无硬编码颜色 / 字号 / 间距 / 圆角
484:□ 状态：空状态有引导和动作；加载有骨架；错误三要素齐全
485:□ 双编码：状态不只依赖颜色
486:□ 数据：DID/哈希中间截断可复制；金额带符号；时间相对+绝对
487:□ 权限：无能力即隐藏；锁定字段附原因；匿名只见登录卡
489:□ i18n：中英文布局都成立，无写死宽度
493:□ 对比度：`[data-variant="destructive"]` 静息与 `:hover` 的文字/底对比度均 ≥4.5:1…
494:□ 命中区：可点击控件的命中区 ≥24×24（WCAG 2.5.8）；`data-kind=back` 的平台配方…必须被页面内联 `padding` 覆盖
510:**等价断言（判定以此为准）——只针对内容列：`candidates` 必须 ≥ 1，`total` 必须为 `0`**（§9 内）
577:**命中区断言（WCAG 2.5.8 · Round 13 由 REQ-015 探针定为「`padding` 被 `action` 转发」= 态①）**
```

**源码行号（本轮现取）**

```text
$ wc -l .aup/pages/admin/general.aup .aup/pages/admin/diagnostics.aup
  255 .aup/pages/admin/general.aup        （REQ-018 §1.2 记的 247 是 Dev 加 2 节侧栏之前的值，+8）
  263 .aup/pages/admin/diagnostics.aup    （同上，原记 255，+8）
$ grep -n "row gap=xs {" .aup/pages/admin/general.aup          → 171, 180, 189（含 label 字段的那三个）
$ grep -nE 'events=|exec:' .aup/pages/admin/general.aup        → 7 处真实写接线（3 save + 2 switch + 2 init）
$ grep -cE 'events=\{|exec:' .aup/pages/admin/diagnostics.aup  → 0 / 0（零写接线）
$ grep -nE 'nav-(orders|ledger)' .aup/pages/admin/general.aup  → 120, 132（Dev 本轮的侧栏新增行）
```

### 5.3 可原样复制的探针片段

```bash
# 0) 前置
curl -s http://127.0.0.1:9333/json/version | head -3          # CDP 活着
curl -s http://127.0.0.1:9333/json/list | grep -o '"id": "[^"]*"' | head  # 取 page target id
# 1) 全量两页（admin，复用同一个既有标签页）
node docs/team/design/raw/UI-011-probe.mjs --target <targetId> --admin \
  --out docs/team/design/raw/UI-011-admin.json
# 2) 访客两页（隔离上下文，跑完自动 dispose；期间 page target 会短暂 +1）
node docs/team/design/raw/UI-011-probe.mjs --guest \
  --out docs/team/design/raw/UI-011-guest.json
# 3) 对比度（纯 Node）
node docs/team/design/raw/UI-011-contrast.mjs
```

单条核心求值（可直接贴进 DevTools Console 逐页跑，1803×908）：

```js
(() => {
  const gs = e => getComputedStyle(e), box = e => { const r = e.getBoundingClientRect();
    return { w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const hdr = document.querySelector('.aup-app-header');
  const act = document.querySelector('[data-active="true"]'), nav = act && act.parentElement;
  const isFC = e => /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(e.tagName);
  const cols = [...document.querySelectorAll('*')].filter(e => /auto|scroll/.test(gs(e).overflowY)
    && !isFC(e) && !(hdr && e.contains(hdr)) && !(nav && e.contains(nav)));
  const b = [...document.querySelectorAll('button,a.aup-action')].find(x => x.innerText.trim() === 'Save');
  return {
    page: location.search, lang: document.documentElement.lang,
    pageScroll: [document.documentElement.scrollHeight, document.documentElement.clientHeight,
                 document.documentElement.scrollWidth, document.documentElement.clientWidth],
    h2: [...new Set([...document.querySelectorAll('h2')].filter(vis).map(h => gs(h).fontSize))],
    h3: [...new Set([...document.querySelectorAll('h3')].filter(vis).map(h => gs(h).fontSize))],
    cards: { pad: [...new Set(cols[0] ? [...cols[0].querySelectorAll('*')].filter(e => vis(e) && gs(e).borderRadius === '10px' && parseFloat(gs(e).borderTopWidth) > 0).map(e => gs(e).padding) : [])] },
    colGap: cols[0] && gs(cols[0]).rowGap,
    links: { candidates: cols.length, total: cols.reduce((n, c) => n + c.querySelectorAll('a:not([target])').length, 0) },
    active: { n: document.querySelectorAll('[data-active="true"]').length, text: act && act.innerText.trim(), aria: act && act.getAttribute('aria-current') },
    sidebar: nav && { rows: nav.querySelectorAll('button,a.aup-action').length, overflow: nav.scrollHeight - nav.clientHeight },
    saveButton: b && { own: box(b), pad: gs(b).padding, fs: gs(b).fontSize, row: box(b.parentElement), rowAlign: gs(b.parentElement).alignItems },
  };
})()
```

---

## 6. 订单 / 账本**新页骨架建议**（**本轮不实施；UI 不写 `.aup`**）

> **声明（REQ-018 §2.1③ 与 L-R14-1 要求，逐字保留）**：**本节只建议，本轮不实施**；实施与否、怎么实施由 **Dev 在 REQ-017 内决定**，**UI 不写 `.aup`**（本轮 UI 写范围只有 `docs/team/design/**`）。**本节没有对 Dev 本轮新建的 `orders` / `ledger` 页做任何走查**——两页的像素走查属后续轮次（登记为 ⬜ 候选，见 §8 R-05）。骨架只依据 spec §15.7、REQ-017 §2.1 的 **CLI 真实能力**、以及本报告在 `general`/`diagnostics` 上实测到的平台行为。
> **只镜像 CLI 真实能力（L-R14-2）**：`node scripts/arcblog-economy.mjs --help` 本轮只读复核（原始输出见 §6.4），可用命令为 `order create|list|show|pay|refund`、`tip create`、`settle --order`、`ledger list [--order <id>] [--type <t>] [--limit <n>|--all]`、`access check|read|list`；链上/支付动作保持 **operator-declared**，页面**不得**声称“已支付/已上链/已结算到账”。

### 6.1 两页共用的骨架（与已走查页逐项同源，避免新页发明形制）

```text
页根            view gap=lg style={height:"100vh", overflow: visible}          # overflow 不能 hidden（arc-contracts §24）
├─ gate 卡      view gap=sm ... padding:"20px"  visible="!$session.authenticated"   # §3.3 L287 豁免；CTA 包 row cross=start
└─ 控制台壳体   row gap=lg cross=stretch style={width:"100vw", marginLeft:"calc(50% - 50vw)", height:"calc(100vh - 48px)"…}
   ├─ 侧栏      view size={width:"clamp(200px,15vw,280px)"} style={…overflowY:auto…}    # 由 node scripts/arcblog-console-nav.mjs 生成，勿手改勿加 id
   └─ 内容承载  view gap=md size={flex:1} style={paddingTop:"14px", paddingBottom:"14px", minHeight:0}
      ├─ 页头   view gap=xs { h2 :title level=2 style={fontSize:"var(--type-subheading)"}  p :desc intent=muted }
      └─ 滚动列 view gap=sm size={flex:1} style={overflowY:auto}                       # 10px = §3.3 L285
         └─ 卡片 view gap=sm style={background:"var(--card-bg)", border:"var(--card-border)",
                     borderRadius:"var(--radius-lg, 10px)", boxShadow: none, padding:"14px", flexShrink: 0}
```

| 骨架约定 | 依据 | 为什么对新页特别重要 |
| -------- | ---- | -------------------- |
| 卡片 `padding 14px` / `gap=sm 10px` / `radius 10px` / `boxShadow none` / 1px `--color-border` | §3.3 L283/L285 | 两页实测 13/13 张卡全中，是仓库最稳的基线 |
| 内容列 `rowGap 10px`；卡片双列用 `gridTemplateColumns:"repeat(auto-fit, minmax(520px,1fr))"` + `gap 14px` + `alignItems start` | §3.3 L283/L285 | 实测 `general` 4 卡 / `diagnostics` 5 卡均为 `728.281×2`，宽屏不塌 |
| 每屏 **≤1 个 `primary`**；行内动作用 `size=sm` 且**必须**内联 `borderRadius: var(--radius-md, 8px)` | §4.3 L350/L353 | 平台默认 `secondary/ghost` 圆角 32px，不内联就破档 |
| **`action` 不得直接放进带 `label` 字段的 flex 行**——否则被拉伸到整行高 | **本报告 D-01 + §4.3 L352/L354 同族机制** | 订单/账本列表行天然是“字段 + 按钮”行，是最容易复现 D-01 的地方 |
| 列表行：`autoSelect=false`、`role=item` 用 `view`（不是 `card`）、`borderBottom: 1px solid var(--color-border)`、`padding: 8px 0`、行标题 `h3` + `fontSize: var(--type-body)`、元信息 `scale=sm intent=muted` | §3.3 L279、§4.2 L334/L335 | 订单/账本的每行字段多，行结构必须先在骨架上定死 |
| 长列表**不要**用 `afs-list filter/serverFilters` 做权威筛选（索引陈旧）；分页/筛选口径以 CLI 为准 | `arc-contracts` §15（CLAUDE.md） | 账本只增不改，索引陈旧会静默吞行 |
| `time mode=display value="${entry.content.*At}" timeMode=relative` | §5.3 L418 | 平台自带 `title`（绝对时间）+ `data-datetime`，**实测达标注**（但 title 固定中文格式 → P-08） |

### 6.2 `orders` 页骨架

```text
ord-1 订单是什么 / 谁写            view 卡：一句话存在理由 + 只读声明 + key-value-list 命令卡
      （order list / order show --id <id> / order create … 全部与 --help 逐字一致，copyable）
ord-2 空态卡（常驻）               view 卡：一句现状 + 一句价值 + 一个动作
      「暂无订单（order list 返回 count 0）」+「订单是经济系统的唯一入口事实」+ 可复制 `order create …`
      禁止把运行期英文兜底 `No items to display` 当空态（afs-list emptyText 不求值 $t()，arc-contracts §19/§20）
ord-3 订单列表（非空）             afs-list from "/instance/app/arcblog/economy/orders"（admin-only）
      每行（字段顺序 = world/order.yaml 顺序，spec §15.7）：
        行首  h3  <buyerDid 中间截断>              ← data-format="did"（§5.1 L404）
        次行  key-value-list：productId / amount + asset / status / hubDid（或「无 Hub」占位）/ createdAt
        status 走 §4.1 L326 路径 B：本地化中性标签 + **原始值可见**（pending|paid|failed|refunded）+ 常驻 dim 说明
        行尾  action size=sm（copyable 命令 `order show --id <id>`）——**不要**把行做成 destructive 主战场
ord-4 订单详情（§50 六问）         路径 A（若 Dev 探针证明 `$params.*` 在 `?page=orders&id=<id>` 可用）：
                                        propBind 绑 economy/orders/<id>.json（+ 可绑到的 settlement / ledger 单记录）
                                   路径 B（降级，必须写明）：列表行内可读的 5 问 + 逐行真命令指引
                                       （`order show --id <id>`、`settle --order <id>`、`ledger list --order <id> --type <t>`）
                                   **交易哈希**：订单记录无该字段 → 只能取 settlement.transactionHash / ledger entry.transactionHash；
                                   为空时显示诚实占位（`—` / 「无哈希（manual adapter / 未结算）」），**禁止生成或补全任何哈希**
ord-5 结算字段落点                  creatorAmount / hubAmount / protocolAmount / policyVersion / status / transactionHash
                                   hubShareWithheld:true 必须有**可见的本地化说明**（不能只靠颜色）
```

**六问 → 真实来源映射（骨架必须逐问留位，不得换源）**

| §50 六问 | 骨架落点（真实字段） |
| -------- | -------------------- |
| 谁付款？ | `order.buyerDid`（`data-format="did"`，中间截断 + 可复制） |
| 谁获益？ | `order.creatorDid` + `order.hubDid`（Hub 是否真分到钱看 `settlement.hubShareWithheld`） |
| 哪个 Hub？ | `order.hubDid`（空 → 显示「无 Hub」，不是空串） |
| 按什么规则分配？ | `order.settlementVersion` / `settlement.policyVersion` + `economy/policies` 的 creator/hub/protocol 比例 |
| 何时结算？ | `order.settledAt`（未结算 → 「未结算」+ `order.status`，不显示空串/`undefined`/假时间） |
| 交易哈希？ | `settlement.transactionHash` / `ledger-entry.transactionHash`；空 → 诚实占位，**不得读成“已结算”** |

### 6.3 `ledger` 页骨架

```text
led-1 账本是什么 / append-only 声明  view 卡：**零写接线**（`events={` 0、`exec:` 0，同 diagnostics DG2 判据）
                                    + 常驻文案「账本只增不改；本页只读；无修改/删除入口」（en + zh）
                                    + 确定性 id 说明：`<orderId>:<type>` / `<orderId>:refund:<type>`
led-2 分页口径卡（常驻）             **不得声称展示全量**：写出 CLI 口径「默认最新 20 条；`--limit <n>`；`--all`」
                                    + 可复制 `ledger list --limit 20` / `--all`；若页面显示总数，其值必须 == `ledger list --all` 的 totalCount
led-3 类型筛选（真命令，不做假筛选）  真实 4 值：`creator_share | hub_share | protocol_fee | refund`
                                    （spec §15.7 列的 7 值里 `payment/tip/settlement` **在实现里从不作为 ledger entry 的 type 出现** → 如实标注差异，**不得伪造**）
                                    命令卡：`ledger list --type <t>`；每行给 `ledger list --order <orderId>`
led-4 账本列表（非空）               afs-list from "/instance/app/arcblog/economy/ledger"
                                    每行字段与 world/ledger-entry.yaml 逐项对照：
                                      id / orderId / type / from / to / asset / amount / status / policyVersion / transactionHash / createdAt
                                      （缺项必须写明为什么缺，不得静默省略 policyVersion / transactionHash）
                                    type 与 status 走 §4.1 L326 路径 B；**行文本必须包含原始值**（可执行断言：rowText.includes(rawValue)）
led-5 结算明细指引                   `settle --order <id>`、`order show --id <id>`、三方金额与 hubShareWithheld 的呈现口径
```

**结构与呈现约束（与 §6.1 同源）**

1. **长表格 → 列表行，不用宽表**：每行 `view gap=xs role=item`，字段用 `key-value-list dense=true` 或 `p scale=sm intent=muted`，行标题 `h3` 15px；一行内信息层级 ≤3（§3.4 L304）。
2. **状态双编码（BUG-005 路径 B / L-R14-4）**：本地化中性标签 + **原始值以可见文本呈现** + 常驻 dim 说明；**不得**只放 `title`；不同真实状态不得共用一句话；平台无法按记录值换色（P-06），因此**文字是唯一可靠通道**，别把状态做成只能靠颜色区分的色点。
3. **可复制命令的等宽问题（P-05，实测）**：`key-value-list ... monospace: true` **在本平台不生效**。若命令必须等宽：改用可内联 `fontFamily` 的承载（实测 `style.fontFamily="monospace"` 被 safe-style 白名单接受），并在落地后用同款探针断言 `getComputedStyle(cmd).fontFamily` 含 `mono`；否则接受比例字体，但**必须**保证 `copyable` 可复制。
4. **空态**：`afs-list.emptyText` 的四种写法全无效、且不 `$t()`（`arc-contracts` §19/§20）→ 空态**必须**由常驻卡承载（现状 + 价值 + 一个动作 = §4.4 L375）。
5. **金额**：`amount` + `asset` 成对出现，缺一不可；分成用「金额 + 比例 + 角色」三元组（§5.2 L409–411）。
6. **i18n**：每个 key 声明在**本页自己的 `i18n {}`** 块（扁平点号），`wrapper.nav-orders` / `wrapper.nav-ledger` 手写在 `.aup/wrapper.aup`；中文行高比英文 +2px（实测），**禁止写死宽度**（§9 L489）。
7. **侧栏预算**：21 节时侧栏溢出 161px（实测），页脚**只能滚动到达**（D24 已裁定）→ 新页同样要求 `footerReachable === true`、无横向裁切；**不要**为塞下新节去改侧栏行高（那会改全局口径）。

### 6.4 §9 逐条自检映射（新页落地时必须逐项过）

| §9 条目（行号） | `orders` 骨架对应 | `ledger` 骨架对应 |
| --- | --- | --- |
| 骨架：侧栏由 console-nav 生成，`--check` 通过（L480） | 用生成器产出的侧栏块，勿手改 | 同 |
| 布局：无纵向滚动条 / 无双滚动条 / 侧栏页脚可滚到（L481） | 页根 `overflow: visible`；滚动只在滚动列 | 同 |
| 页头：标题 + 一句话说明 + 至多一个主操作（L482） | `:title` + `:desc`；列表页无主操作（只读） | 同（只读页，`primary` 0 是合法值） |
| Token：无硬编码颜色/字号/间距/圆角（L483） | 全部 `var(--*)`；圆角用 `--radius-md/lg` | 同 |
| 状态：空态有引导和动作；错误三要素（L484/L381） | `ord-2` 空态卡含可复制 `order create`；AFS 读失败给「发生了什么+为什么+怎么办」 | `led-2` 写明 CLI 口径；空账本 → 「暂无账本条目 + 先 `settle --order`」 |
| 双编码：状态不只依赖颜色（L485/L257） | status 文字 + 原始值 | type/status 文字 + 原始值 |
| 数据：DID 中间截断可复制；金额带符号；时间相对+绝对（L486） | `data-format="did"`；`amount + asset`；`time … timeMode=relative` | 金额 + asset；`transactionHash` 空 → 诚实占位 |
| 权限：匿名只见登录卡；无能力即隐藏（L487） | gate 卡 + `economy/orders` admin-only | 同（`economy/ledger` admin-only） |
| 打断：无“成功”弹窗；不可逆操作有确认（L488） | **本页零写操作** → 无确认需求 | 同（append-only，零写入口） |
| i18n：中英都成立，无写死宽度（L489） | en/zh 逐键齐备 | 同 |
| 克制：没有为填满空间而存在的内容（L490） | 每张卡一个职责 | 同 |
| 点击去向（§2.6）：无把整页替换掉的链接（L491/L215） | 内容列 `candidates ≥ 1 && total === 0`；`order show` 用可复制命令而非无 `target` 链接 | 同 |
| 对比度：destructive 静息/hover ≥4.5（L493） | 本两页**无 destructive** → 不适用（若加「退款」入口则必须复验） | 同 |
| 命中区：可点击控件 ≥24×24（L494） | 本页自建 `action` 用 sm 档（`padding 5px 12px`，实测 29–31px 高，达标）；平台 `.aup-copy-btn` 18×18 是 P-04 | 同 |

**两处“只读源码、不作走查结论”的静态 `grep`（记录，避免越界猜测）**：仓库内已存在 `style={fontFamily: monospace}` 的写法（`node_modules` 之外、`.aup/pages/**` 命中）与 `key-value-list dense=true fields=[… monospace: true, copyable: true]` 的写法；**本报告不对这些页做任何 DOM 结论**，P-05 的结论只来自 `diagnostics` 的实测 + 平台样式表 `kv-mono` 计数 0。

**CLI 真实能力（本轮只读复核，原始输出）**

```text
$ node scripts/arcblog-economy.mjs --help | grep -nE "order |ledger |tip |settle|access "
12:  node scripts/arcblog-economy.mjs order create --id <id> --product-id <id> [--buyer-did <did>] [--hub-did <did>]
13:  node scripts/arcblog-economy.mjs order list
14:  node scripts/arcblog-economy.mjs order show --id <id>
15:  node scripts/arcblog-economy.mjs order pay --id <id> [--adapter manual] [--payment-ref <ref>]
16:  node scripts/arcblog-economy.mjs order refund --id <id> [--reason <text>]
17:  node scripts/arcblog-economy.mjs tip create --id <id> --creator-did <did> --amount <n> [--hub-did <did>]
18:  node scripts/arcblog-economy.mjs settle --order <id>
19:  node scripts/arcblog-economy.mjs ledger list [--order <id>] [--type <t>] [--limit <n>|--all]
21:  node scripts/arcblog-economy.mjs access check --content <id> --reader <did>
22:  node scripts/arcblog-economy.mjs access read --content <id> --reader <did>   # paid full text (spec §86)
23:  node scripts/arcblog-economy.mjs access list [--content <id>] [--reader <did>]
```

（`--type` 已由 Dev `task-45` 落地；`[--limit <n>|--all]` 现只出现 1 次。）

**实例数据现状（只读，骨架空态口径的依据）**

```text
$ node scripts/arcblog-economy.mjs order list   → count 0 / orders []        （本报告§6.2 以空态为默认态）
$ node scripts/arcblog-economy.mjs ledger list --all → totalCount 0
```

---

## 7. 未验证 / 受限项（必须与结论一起读）

| # | 项 | 原因 / 影响 |
| -- | -- | ----------- |
| R-01 | **真实 `:hover` 态**（`destructive` 静息/hover 对比度断言，§9 L493/L567） | 两页内容区 `[data-variant=destructive]` = **0**，无对象；且真实 hover 需 CDP `CSS.forcePseudoState` + ≥800ms（UI-010 已验，本轮未重复）。**本项在两页上不适用**，不是“未验” |
| R-02 | **`diagnostics` 的“无快照”空态**（REQ-018 A6.2） | 实例**已有** `config/diagnostics/summary/last-run.json`（`ranAt 2026-09-28T02:54:45.432Z`，count 9、warnings 3）→ 卡片非空，**空态不可观察**。已改用**静态复核**证明占位文案存在（`checks-hint` ×2、`snapshot-desc`），并**不声称已观察到空态渲染** |
| R-03 | **`?page=` 深链静默归一化** | UI-007 §7.3 的旧观察本轮**未受控复现**。本轮只发生一次「导航到不存在的 `?page=ledgersanity` 后，标签页此后被发现停在 `/`」，且同窗口有其他 teammate 在驱动同一浏览器 → **归因不成立，不作缺陷定性**；取数 run 全部有 `sameDeepLink: true` 断言 |
| R-04 | **异步/竞态读数**（`.aup-copy-btn` 数量） | 平台复制键随 `propBind`/`afs-list` 落定才出现（UI-007 §6.1 注）。本轮固定 `3500ms` 后读数，`diagnostics` 稳定 18 个（与 REQ-018 §1.2 记录一致）；**未做连读两次取并集** |
| R-05 | **订单/账本新页的像素走查** | **L-R14-1 明令本轮不走**。`orders` / `ledger` 的像素级结论（间距/圆角/对比度/命中区/骨架）登记为**后续轮次 ⬜ 候选** |
| R-06 | **暗色模式 / 非 admin 已登录会话** | 本轮口径与 UI-007 一致：只测 `mode=light` + admin/guest 两态 |
| R-07 | **zh 逐条目视** | admin zh 用 `?page=general&locale=zh` 取到（`lang=zh`，`rawKeyLeak=false`，2 列网格与字号集合不变）；**guest zh 为隔离上下文默认语言**。`?locale=` 在本平台**粘性**：曾把共享标签页切到 zh，**已用 `sessionStorage.clear()` + `arc_lang=en` cookie 还原**（还原后 `lang=en`、URL `?page=general`），此过程与风险已记录 |

---

## 8. 标准缺口 / 需求事实登记（**只登记，不改口径**）

> 依据 REQ-018 §2.1③ 与用户口径：**本轮未获授权改标准的任何口径/期望值**；下面各项**均未落地**，交 PM/Lead 裁定。

| # | 位置 | 缺口 / 事实 | 证据 | 建议 |
| -- | ---- | ----------- | ---- | ---- |
| D-06 | §4.3 L352–354 | 只写了「**宽度**被卡片拉伸 → 包 `row cross=start`」与「行内 `itemStyle=card` 按钮被拉伸到卡片等高」。**缺「高度被同级带 `label` 的字段外壳拉伸」**这一形态（D-01） | D-01 实测：`row` 高 60.39 = `.aup-input` 高，按钮被 stretch 到 60.39，而同页其它 sm 按钮 29px | **加条目**（不是改口径）：把「`action` 不得作为 `row` 中带 `label` 字段的同级子项除非 `cross=start`」写成 §4.3 一行 |
| D-07 | §4.1 L320/L326 | 要求「色点 + 文字」双编码；但按记录值换色的**色点在本平台不可实现**（§28.1/§28.8 限制），`diagnostics` checks 行实测只能文字（P-06） | P-06 实测 + `intents` 只有 `muted` | 建议在 §4.1 的平台受限段补一句「按记录值变化的色点不可实现，文字承担双编码」；**不要**据此要求 Dev 造覆盖 |
| D-08 | §5.3 L418 | 「悬停显示绝对时间」实测**成立**，但平台 `title` 的格式**固定中文**（`lang=en` 页面上也是 `2026年9月28日 10:54`） | P-08 原始 `title`/`data-datetime` | 登记为平台 i18n 事实（可选写进 §5.3 的备注或 `arc-contracts`，Lead 写范围） |
| D-09 | §3.3 L285 / §9 L481 | 标准只写「内容区滚动间隔 `gap=sm`(10px)」。实测**外层内容承载**（页头与滚动列之间）为 `gap=md` = **20px**，21 页统一；滚动容器本身 10px | S5 实测：`wrapperGap 20px` + `colGap 10px`（两页） | 判定为**无偏差**（标准约束的对象是滚动容器）；建议补一句区分，免得后续走查把它读成 V4/V5 复发 |
| D-10 | REQ-018 §1.2 / A6.1（**PM 的文件，非标准**） | ① 两页行数记「247 / 255」——Dev 加 2 节侧栏后为 **255 / 263**（`git diff --numstat` = `8 0`）；② A6.1 写「**三个**受控 `SELECT`」——实测是 **2 个 `<select>` + 1 个 `<input type=text>`**（`general.aup:172,181,190`），三者命中区均 ≥24×24 | §5.2 的 `wc -l`；`selects` 原始输出（`INPUT 634.16×36`、`SELECT 634.16×38` ×2） | 建议 PM 在 §7 写回时更正这两处**事实**（不改验收口径） |

**本轮未因任何平台差异改动任何 `.aup` / `.web` / 令牌 / 标准口径。**

---

## 9. PM / QA 可复跑命令（A0 + A1–A9 对照）

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog

# ---- A0 门（UI 零源码改动；下列只读门本轮实测全绿） ----
arc dsl validate --json                        # → "issues": []
npm test                                       # → tests 28 / pass 28 / fail 0（~1.0s）
node scripts/arcblog-console-nav.mjs --check   # → {"ok":true,"action":"check","pages":21}
arc dsl generate --check                       # → Would generate 0 file(s) — nothing to change
diff -r .aup dist/.aup                         # → 无输出（Dev 的 build 已同步）
git status --short -- docs/team/design docs/ArcBlog-admin-ui-design.md   # → 仅 UI-011 产物
# ⚠️ UI 本轮**没有**跑 `arc blocklet build`：它会写 dist/**（Dev 的写范围），且 Dev 正在并发 build

# ---- A1 方法自证 ----
curl -s http://127.0.0.1:9333/json/list | grep -o '"id": "[^"]*"'   # 取 page target id 后钉住
node docs/team/design/raw/UI-011-probe.mjs --target <id> --admin --out /tmp/re-admin.json
node docs/team/design/raw/UI-011-probe.mjs --guest --out /tmp/re-guest.json
# 期望：admin pageTargets before/during/afterProbe/afterClose = 1/1/1/1；guest = 1/2/2/1
# 期望：每页 steps[].sameDeepLink = true；viewport 1803x908@1；waitMs 3500

# ---- A3 抽验（QA 至少 3 条） ----
# ① D-01：Save 按钮 h（期望 60.39 / 62.39 —— 实现偏差）
node -e "const d=require('/tmp/re-admin.json');console.log(d.pages.general.buttonList.filter(b=>b.text==='Save').map(b=>[b.box.h,b.pad,b.fs]))"
# ② h2/h3 字号集合（期望 ['17px'] / ['15px']）
node -e "const d=require('/tmp/re-admin.json');for(const[p,v] of Object.entries(d.pages))console.log(p,JSON.stringify([...new Set(v.headings.filter(h=>h.tag==='H2').map(h=>h.fs))]),JSON.stringify([...new Set(v.headings.filter(h=>h.tag==='H3').map(h=>h.fs))]))"
# ③ §2.6 等价断言（期望 candidates 1 / total 0）
node -e "const d=require('/tmp/re-admin.json');for(const[p,v] of Object.entries(d.pages))console.log(p,v.contentCol)"
# ④ 侧栏页脚可达（期望 reachable true）+ 当前行计数（期望 1）
node -e "const d=require('/tmp/re-admin.json');for(const[p,v] of Object.entries(d.pages))console.log(p,v.activeCount,v.sidebar.overflow,v.sidebar.footerReach)"

# ---- A4 平台差异分离（期望：主表 1 条实现偏差；平台差异表 8 条） ----
grep -c '^| \*\*D-0' docs/team/design/UI-011-newpage-pixel-audit.md   # 实现偏差条数
grep -c '^| \*\*P-0' docs/team/design/UI-011-newpage-pixel-audit.md   # 平台差异条数

# ---- A5 骨架建议「零 .aup 改动」 ----
git diff --name-only -- .aup | wc -l           # 期望 0（UI 未动 .aup；Dev 的改动请在 `git status` 上区分 owner）

# ---- A6 两页必测项 ----
grep -cE 'events=\{|exec:' .aup/pages/admin/diagnostics.aup   # 期望 0（零写接线）
node scripts/arcblog-doctor.mjs --help | grep -n "Checks ("    # 期望 9 → 与页面 checks 行数一致
node docs/team/design/raw/UI-011-contrast.mjs                  # 期望 dim on card 4.57 / info on card 4.49 / warning on card 4.28

# ---- A7 i18n ----
# ?page=general&locale=zh 复核：lang=zh、无 $t( 泄漏、卡片仍 2 列（728/728）
# ⚠️ locale 是粘性会话状态：测完请用 sessionStorage.clear() + arc_lang=en 还原（否则共享标签页会留在 zh）
```

**完成定义（REQ-018 §6）自查**：① 产物路径 ✅（本报告 + `raw/**` **6 个文件**；**无截图**，见下）；② 方法自证 ✅（§0.2/§0.3 的 target 计数、视口、等待、HEAD、gate-lock、mtime、pages=21）；③ 主表与平台差异表的行数 ✅（1 / 8）与影响面+章节 ✅；④ `grep -n` 原始输出 ✅（§5.2）；⑤ `git status` 证据 ✅（表头）；⑥ 受限清单 ✅（§7）。

> **无截图**：REQ-018 §5 规定截图目录需先与 QA 约定，本轮**未新增截图**；派生的对比度/几何结论全部由 `raw/UI-011-*.json` 的原始字符串支撑（另有 1 张**只落 `/tmp`、不进仓库**的视口截图用于作者自检）。
