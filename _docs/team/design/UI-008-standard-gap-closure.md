# UI-008：`docs/ArcBlog-admin-ui-design.md` 标准缺口收口（D1–D5 + V3/V8 裁定写入）—— before/after 记录

| 字段 | 值 |
| ---- | -- |
| 提案号 | UI-008（**标准对齐记录**，非新设计提案） |
| 状态 | 已实现（**V1.6 → V1.7**），待 PM / QA 复核 |
| 提出轮次 | round-11（`task-31`；Lead 裁定 **D27**：授权 UI 做 **D1–D5 文档对齐**，「只对齐事实与记录既有裁定，不改期望值与断言表达式」） |
| 上游依据 | [UI-007](UI-007-console-pixel-walkthrough.md) §2 V3/V8、§3.1、§3.5、§5、§7.2、§7.4 D1–D5 · Lead **R11F** 裁定 **D20–D27**（**D23** V3 不修记 R12、**D24** 侧栏自滚可接受）· [REQ-002](../requirements/REQ-002-console-consistency-fixes.md) §3 A6（Lead 2026-09-27 **D4** gate 卡豁免留档）· [`arc-contracts.md`](../../arc-contracts.md) §21.6 / §23 / §24 |
| 实现方 | **UI 自改**（`docs/ArcBlog-admin-ui-design.md`，本轮写范围由 D27 明确授权）——**未**改 `.aup/**`、`scripts/**`、spec、checklist、`arc-contracts.md` |
| 净改动（本轮 UI-008 自身） | 9 个编辑点 = **7 行替换 + 2 处新增段落（6 行）**；`diff 改前基线 → 当前` = **13 insertions / 7 deletions** |
| `git diff --stat`（对 HEAD） | `1 file changed, 15 insertions(+), 9 deletions(-)`——其中 **3/3 是本轮开工前工作区已带的 UI-007 V1.6 未提交增量**（开工前实测 `3 insertions(+), 3 deletions(-)`：V1.6 版本行 + §2.1 两行） |
| 落盘产物 | 本文件 · [`raw/UI-008-own-delta.txt`](raw/UI-008-own-delta.txt)（改前基线 → 当前，仅本轮增量）· [`raw/UI-008-standard-diff.txt`](raw/UI-008-standard-diff.txt)（`git diff` 对 HEAD 全量，含 UI-007 增量） |

---

## 1. 授权与范围

D27 把 UI-007 只报告不改的 5 条文档缺口（D1–D5）与 Lead 对 V3/V8 的两条裁定放行给 UI 落入标准。**口径边界**（D27 原文约束）：

- **只对齐事实与记录既有裁定**：写进标准的都是已实测的数值、已存在的豁免（REQ-002 §A6 + Lead D4）与 Lead 已下的裁定（D23 / D24），**不新立期望值**。
- **不改期望值与断言表达式**：唯一被替换的取值是 §4.3「尺寸档高度 39px/31px」——D2 明确要求「改为实测值口径（36/38/29px）或改为不依赖字体度量的表述」；§9 的十二条判据结构与两个等价断言块不动。
- **不碰**：`.aup/**`、`scripts/**`、`docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/arc-contracts.md`。

> 行号约定：**改前** = 本轮开工前的工作区快照（V1.6，= HEAD `17aac1f` + UI-007 未提交的 3 行）；**改后** = 当前工作区（V1.7）。等价的「开工前基线」重建方式见 §5.6。

---

## 2. 逐条 before → after

### 2.1 D1 —— gate 卡 20px 豁免写进 §3.3（Lead D4）

| 项 | 内容 |
| -- | ---- |
| 位置 | §3.3 间距刻度，新增段落（**改后 286 行**，插在「控制台精修取值」与「禁止出现刻度外的裸数值」之间） |
| before | §3.3 只有「控制台统一 14px」，**没有任何 gate 卡豁免**——标准与实现（17/17 页 gate 卡 20px）看似冲突（UI-007 §7.4 D1，UI-007 第 516 行） |
| after | 新增 **「登录门（gate）卡豁免（Lead D4 裁定，本轮写入标准）」**：gate 卡**豁免**「控制台统一 14px」，保持 **`padding: 20px`**；**登录门 ≠ 控制台内容卡**；引 REQ-002 §3 A6 原文（含「不得再要求『17 页 gate 卡 20px→14px』」）；注明 `compose` / `compose-edit` 的 gate 同口径 |
| 依据 | UI-007 §5（第 344 行）：实测 17/17 页 guest gate 卡 `padding: 20px`、内容卡 `14px`；REQ-002 §3 A6（第 68 行）Lead 2026-09-27 **D4** 裁定原文；UI-007 §7.4 D1 |
| 性质 | **把已有裁定写进标准**（不是新期望值）；期望值未变——gate 卡本来就该是 20px |

### 2.2 D2 —— §4.3 尺寸档高度改准为实测口径（推翻 39px/31px）

| 项 | 内容 |
| -- | ---- |
| 位置 | §4.3 按钮层级 · 控制台按钮统一规则表，**尺寸档**行（改前 **345 行** → 改后 **349 行**） |
| before | `\| 尺寸档 \| 默认档 `padding: 8px 16px`、高度 39px、字号 14.4px；`size=sm` 档 `padding: 5px 12px`、高度 31px、字号 13.6px。同屏只允许这两档 \|` |
| after | `\| 尺寸档 \| 默认档 `padding: 8px 16px`、字号 14.4px；`size=sm` 档 `padding: 5px 12px`、字号 13.6px。同屏只允许这两档。**高度不写死**——高度由 `line-height: normal` + 字体度量派生，2026-09-28 实测默认档 **36px（en）/ 38px（zh CJK）**、`size=sm` **29px**；旧的「39px / 31px」是本机旧主题字体下的测量值，已被 UI-007 §3.5 实测推翻，因此判定看两档的 `padding`/字号取值与同屏一致性，**不看某个固定像素**（Lead **D2** 授权改准） \|` |
| 依据 | UI-007 §3.5（第 273–284 行）：同一 `font-size: 14.4px`，en 行高 18px / zh 20px；`Write a post` **36px**（en）vs gate CTA `使用 DID Wallet 登录` **38px**（zh）；§1.2 逐页表（posts `36 · 29`）；`/tmp/ui007-precision.mjs`（`box-sizing: border-box`、`line-height: normal`）；UI-007 §7.4 D2（第 517 行） |
| 性质 | **本轮唯一被替换的期望值**，由 D2 明确授权；写法规避字体度量（判定改为「两档 `padding`/字号 + 同屏一致性」，不再依赖固定像素） |

### 2.3 D3 —— `auto-surface` 不受控制台 token 管辖的免责说明（§3.3）

| 项 | 内容 |
| -- | ---- |
| 位置 | §3.3 间距刻度，紧跟 D1 段之后（**改后 288 行**） |
| before | 无任何说明——§3.3「控制台统一 14px」与 §3.4「页面标题 17px」在 `?page=appearance` 上**永远判不通过**（UI-007 §3.1 结论 + §7.4 D3，UI-007 第 518 行） |
| after | 新增 **「平台原语 `auto-surface`（`?page=appearance`）不受本节与 §3.4 管辖（免责）」**：平台原语自带内层 **20px** padding、`0 1px 2px rgba(26,26,31,.08)` 阴影、默认 **21.6px** 内层标题，且**不读**页面内联 `style`；因此 §3.3 的 14px 与 §3.4 的 17px 在 appearance 上不适用，§9「Token」「布局」两项按此豁免判定 |
| 依据 | UI-007 §3.1（第 249–253 行）实测：外壳 `padding: 0px` / `boxShadow: 0 1px 2px rgba(26,26,31,.08)` / `borderRadius: 10px`，内层 `[data-variant=settings-section]` 自带 `padding: 20px`，其 `h2` 21.6px；`.agents/skills/aup-dsl/references/primitives.md` 把 `auto-surface` 列为 verified usage；UI-007 §7.4 D3 |
| 性质 | 免责说明（记录平台事实），不改任何期望值 |

### 2.4 D4 —— §9 补侧栏断言（按 D24 口径）

| 项 | 内容 |
| -- | ---- |
| 位置 | §9 页面验收清单，第 2 条「布局」（改前 **471 行** → 改后 **477 行**） |
| before | `□ 布局：宽高 100% 流式；页面固定无纵向滚动条，滚动只发生在 console-pane（……概念名……）内（无双滚动条）` |
| after | 同条**追加**：`；节数 ≥ 18 时允许侧栏自身滚动（§2.5），但**页脚（品牌/关于/RSS/版权）必须能通过该滚动到达**——判据：侧栏滚动到底后页脚最后一行底边进入视口（不要求首屏可见，Lead D24）` |
| 依据 | UI-007 §7.4 D4（第 519 行）：§9 缺可执行断言，第 18 节后口径首次被打破；Lead **D24**（接受侧栏自身滚动，验收改为「页脚可通过侧栏滚动到达」，**不要求首屏可见**） |
| 条目数 | **12 → 12（未新增条目）**——D4 以「写进 §9 的对应条目」落实（对应条目 = 承担滚动归属判定的「布局」条），因此 `grep -c '^□'` 与改前一致（见 §4.3）。**这是对任务书校验口径的显式说明**：未新增 `□` |

### 2.5 D5 —— §2.1 内边距措辞冲突改准（实测 32px 左缩进）

| 项 | 内容 |
| -- | ---- |
| 位置 | §2.1 控制台骨架表，**侧边栏样式**行（改前 **66 行** → 改后 **66 行**） |
| before | `…菜单项无边框无圆角、左对齐满宽、左右内边距 `8px 20px`；…`——与同表「菜单项（二级）文字左缩进 **32px**」及实测 `padding: 8px 20px 8px 32px` 冲突（UI-007 §7.4 D5，UI-007 第 520 行） |
| after | `…菜单项无边框无圆角、左对齐满宽、内边距 `8px 20px 8px 32px`（2026-09-28 实测：垂直 8px、右 20px、**左 32px**——左侧 32px 就是下行「菜单项（二级）」的层级缩进，同一行只有一个左缩进，不是两套取值）；…` |
| 依据 | UI-007 §7.2（第 486–496 行）与 V8 的侧栏 JSON：`"pad":"8px 20px 8px 32px"`；`/tmp/ui007-navpad.mjs` 输出选中/未选中行 pad 均为 `8px 20px 8px 32px`；UI-007 §7.4 D5 |
| 性质 | **措辞改准**（歧义消解）：把「左右内边距」改为完整四值 shorthand，并说明左 32px 与「菜单项（二级）32px」是同一事实，不是两套取值 |

### 2.6 V3（D23）—— destructive 按钮文字 3.99:1 记为 R12 设计项（不改令牌）

| 项 | 内容 |
| -- | ---- |
| 位置 | §4.3 按钮层级，规则表之后新增引用段（**改后 354–355 行**） |
| before | 标准**未登记**该现状（UI-007 §2 V3 只报告） |
| after | 新增 **「已知现状 · destructive 按钮文字对比度 3.99:1（Lead D23 裁定：本轮不修，记为 R12 设计项）」**：`variant=destructive size=sm` 文字 `--color-danger` #c53030 叠 danger 12% 淡化底（合成 `rgb(235,216,213)`）→ **3.99:1 < AA 4.5:1**（13.6px 正常字重，无大字豁免）；受影响 `posts` 34 / `hub` 4 / `factory` 6；**是平台 variant 色值 + 用法的组合**，不是令牌选错（`--color-danger` 在页面底 / 卡片底为 5.23:1 / 4.76:1）；D23 裁定本轮不修，R12 给令牌级方案前**不改任何主题令牌** |
| 依据 | UI-007 §2 V3（第 161–174 行）+ §4 对比度表（第 311 行，`3.99:1`）；Lead **D23**（V3 不修 → R12 设计项，需 UI 给令牌级方案，本轮只在标准里标注现状） |
| 性质 | 现状登记 + 裁定留档，**不新增期望值、不改令牌** |

### 2.7 V8（D24）—— §2.5 明确「节数 ≥ 18 侧栏自滚可接受」

| 项 | 内容 |
| -- | ---- |
| 位置 | §2.5 全高流式布局与滚动归属，规则列表第 6 条（改前 **169 行** → 改后 **169 行**） |
| before | `* **侧边栏不独立滚动**：…（**本文档不写死数字**，当前 4 组 17 项，一律以命令输出为准），一屏可见；极端窄高下溢出时侧边栏自身滚动（该容器 `overflowY: auto`），不撑破页面。` |
| after | `* **侧边栏不独立滚动（默认；节数 ≥ 18 时例外，见下条口径）**：…（…2026-09-28 实测 5 组 18 项…），默认一屏可见；**节数 ≥ 18 时菜单总高超过一屏预算，侧栏自身滚动是可接受形态**（容器 `overflowY: auto`，不撑破页面、不产生双滚动条）——此时验收口径是「**页脚（品牌 / 关于 / RSS / 版权）必须能通过侧栏自身滚动到达**」，**不要求页脚首屏可见**（Lead **D24**，2026-09-28）；极端窄高下溢出同此口径。实测：1803×908 下 18 节侧栏 `scrollHeight - clientHeight` = **56px（en）/ 86px（zh）**，页脚块落到折叠线下（UI-007 §2 V8），而 17 节时同算式刚好放得下。` |
| 依据 | UI-007 §2 V8（第 207–221 行）：en `{"clientH":860,"scrollH":916,"overflow":56,"rows":20,"footerBelowFold":true}`、zh `scrollH 946 / clientH 860 → 溢出 86px`、页脚底 993.5 → 越出 85.5px；Lead **D24**（接受侧栏自身滚动 = §2.5 既有口径的显式化，验收改为「页脚可通过侧栏滚动到达」） |
| 性质 | 口径**显式化 + 例外边界写明**；「极端窄高自滚」原文本就存在，本处把「节数 ≥ 18 也会触发」与「验收判据」写成可判定表述 |

---

## 3. 附带事实对齐（3 处过期的节数示例值）

V8 条款要求写明「节数 ≥ 18」，若同文档他处仍写「当前 4 组 17 项」将自相矛盾。按 D27「只对齐事实」的口径，把 3 处**已过期**的当前值改为本轮实测值（**均以命令输出为准**，未写死为期望值）：

| # | 位置 | before | after |
| - | ---- | ------ | ----- |
| A | §2.3（改前/改后 117 行） | `  # → groups=4 sections=17` | `  # → groups=5 sections=18（2026-09-28 实测；一律以此命令输出为准）` |
| B | §2.5 侧边栏口径条（169 行） | `当前 4 组 17 项` | `2026-09-28 实测 5 组 18 项`（见 §2.7） |
| C | §2.5 菜单口径读取命令（改前/改后 177 行） | `> # → groups=4 sections=17` | `> # → groups=5 sections=18（2026-09-28 实测；一律以此命令输出为准）` |

实测命令与真实输出（本轮执行，见 §5.1）：

```bash
$ node -e "import('./scripts/console-nav.mjs').then(m=>console.log('groups='+m.CONSOLE_MENU.length,'sections='+m.CONSOLE_SECTIONS.length))"
groups=5 sections=18
```

> 这一处是**必要**的，不是夹带：不改它，文档会一边说「节数 ≥ 18 是例外形态」、一边说「当前 17 项」。文档自身规则是「不写死数字、以命令输出为准」，改的是示例输出而非期望值。

---

## 4. 声明未改动项（逐字节证据）

### 4.1 断言表达式 —— 4 个 ```js 块逐字节相同

块位置：§2.6 原断言（改前 199–206 / 改后 199–206）· §2.6 等价断言（改前 217–233 / 改后 217–233）· §9 原断言（改前 487–494 / **改后 493–500**）· §9 等价断言（改前 500–516 / **改后 506–522**）。§9 两个块的**行号因本轮新增行而下移 6 行，内容逐字节不变**：

| 块 | 改前 sha256 | 改后 sha256 | 结论 |
| -- | ----------- | ----------- | ---- |
| §2.6 原断言 / §9 原断言（两处文本相同） | `b715deff1938d9a38fa86305cd0248fea249d432eb03b22ee74a9b23b5e2009b` | `b715deff1938d9a38fa86305cd0248fea249d432eb03b22ee74a9b23b5e2009b` | ✅ 相同 |
| §2.6 等价断言 / §9 等价断言（两处文本相同） | `3ff23301bad27627321198ade80539ba3a7f5a19c25350ae20d9ea3c63d2de6a` | `3ff23301bad27627321198ade80539ba3a7f5a19c25350ae20d9ea3c63d2de6a` | ✅ 相同 |
| 四块拼接总哈希 | `cb758e82fb0b2813b6a5b62be4320e67ff0849c4800566253b01164f158b266a` | `cb758e82fb0b2813b6a5b62be4320e67ff0849c4800566253b01164f158b266a` | ✅ 相同 |

复现：`node /tmp/ui008-blocks-full.mjs`（脚本内容见 §5.5）；改前基线用「HEAD 快照 + UI-007 的 3 行未提交增量」重建（§5.6）。

### 4.2 期望值

* **§3 设计 Token 全表**（颜色、圆角边线、间距刻度取值即 4/8/10/14/20/32px、排版层级取值）——取值一条未动，只**新增** D1/D3 两段说明。
* **§4.3** 圆角 `var(--radius-md, 8px)`、宽度「内容宽不得被拉伸」、层级、列表行内按钮「`cross=start`」——未动；**只有「尺寸档」行的高度按 D2 授权改准**（§2.2，本轮唯一被替换的期望值）。
* **§4.1 / §4.2 / §4.4 / §4.5 / §4.6、§5、§6、§7、§8、§10、附录 A** —— 未动。
* **§9 十二条判据**：第 1 条（骨架）、第 3–12 条文字逐字节未动（§4.3 证据）。

### 4.3 §9 条目结构（12 → 12，未新增）

```bash
$ diff <(grep '^□' <改前基线> | sed '2d') <(grep '^□' docs/ArcBlog-admin-ui-design.md | sed '2d')
# （无输出）
IDENTICAL (11/11 other items)
$ printf 'before='; grep -c '^□' <改前基线>; printf 'after='; grep -c '^□' docs/ArcBlog-admin-ui-design.md
before=12
after=12
```

即：**条目数 12 = 12**；除第 2 条「布局」（按 D4 追加 D24 判据）外，其余 **11/11 条逐字节相同**。D4 采用「写进对应条目」而非新增条目（见 §2.4）。

### 4.4 改动清单（净结果）

`diff 改前基线 → 当前` 只命中 9 个位置（`raw/UI-008-own-delta.txt`，13 ins / 7 del）：

```text
5c5        版本行 V1.6 → V1.7
66c66      §2.1 侧边栏样式（D5）
117c117    §2.3 节数示例值（附带 A）
169c169    §2.5 侧边栏口径（V8/D24）
177c177    §2.5 节数示例值（附带 C）
285a286,289 §3.3 新增 gate 豁免 + auto-surface 免责（D1/D3，4 行）
345c349    §4.3 尺寸档（D2）
349a354,355 §4.3 新增 destructive 现状（V3/D23，2 行）
471c477    §9 布局条目（D4）
```

---

## 5. 验收命令与真实输出

### 5.1 节数实测（支撑 §3 与 V8）

```bash
$ node -e "import('./scripts/console-nav.mjs').then(m=>console.log('groups='+m.CONSOLE_MENU.length,'sections='+m.CONSOLE_SECTIONS.length, JSON.stringify(m.CONSOLE_SECTIONS)))"
groups=5 sections=18 ["dashboard","posts","pages","compose","heroes","categories","tags","seo","feeds","appearance","operations","hub","media","agents","policy","access","factory","settings-general"]
```

### 5.2 本轮质量门（全部真跑）

```bash
$ arc dsl validate --json | tail -5
    "pages/theme-bridge/seo/description",
    "pages/theme-bridge/seo/title"
  ],
  "issues": []                                      # ✅ issues 为空

$ npm test | tail -12
ℹ suites 0
ℹ pass 28
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 977.145
fast tier passed — this is the gate.               # ✅ 28/28

$ node scripts/arcblog-console-nav.mjs --check | tail -5
{
  "ok": true,
  "action": "check",
  "pages": 18
}                                                   # ✅ 无漂移（exit 0）

$ arc dsl generate --check | tail -4
Would generate 0 file(s) (dry-run) — nothing to change
  path: /Users/shenxiuqiang/workspace/ArcBlog
  files: 7
                                                    # ✅ 无漂移（exit 0）
```

* **`arc blocklet build` 未跑**：门条件是「改了 `.aup` / 改了 `.web/**` 生成物」——本轮只改 `.md`，**条件不触发**；`.aup/**` 一个字节未动（`git status` 里 `.aup/**` 的 `M` 全部是本轮开工前 Dev/他人产物）。
* **`npm run test:live` 未跑**：本轮为修复窗口，任务书明确禁止全量 live。
* **定向单跑未跑**：本轮未改 CLI / AFS 记录 / 链适配器 / daemon 路由（纯文档），无需取 `.gate-lock`（跑门时确认 `docs/team/.gate-lock` **不存在**）。

### 5.3 文档级校验（任务书指定）

```bash
$ git diff --stat -- docs/ArcBlog-admin-ui-design.md
 docs/ArcBlog-admin-ui-design.md | 24 +++++++++++++++---------
 1 file changed, 15 insertions(+), 9 deletions(-)

$ grep -c '^□' docs/ArcBlog-admin-ui-design.md
12                                                  # ✅ 与改前一致（12）
```

（`15/9` 含 UI-007 的 V1.6 未提交增量 3/3；本轮自身 = 13/7，见 §4.4。）

### 5.4 断言块逐字节比对

```bash
$ node /tmp/ui008-blocks-full.mjs /tmp/ui008-preround.md docs/ArcBlog-admin-ui-design.md
/tmp/ui008-preround.md              block#1  lines 199-206  b715deff1938d9a38fa86305cd0248fea249d432eb03b22ee74a9b23b5e2009b
/tmp/ui008-preround.md              block#2  lines 217-233  3ff23301bad27627321198ade80539ba3a7f5a19c25350ae20d9ea3c63d2de6a
/tmp/ui008-preround.md              block#3  lines 487-494  b715deff1938d9a38fa86305cd0248fea249d432eb03b22ee74a9b23b5e2009b
/tmp/ui008-preround.md              block#4  lines 500-516  3ff23301bad27627321198ade80539ba3a7f5a19c25350ae20d9ea3c63d2de6a
docs/ArcBlog-admin-ui-design.md     block#1  lines 199-206  b715deff1938d9a38fa86305cd0248fea249d432eb03b22ee74a9b23b5e2009b
docs/ArcBlog-admin-ui-design.md     block#2  lines 217-233  3ff23301bad27627321198ade80539ba3a7f5a19c25350ae20d9ea3c63d2de6a
docs/ArcBlog-admin-ui-design.md     block#3  lines 493-500  b715deff1938d9a38fa86305cd0248fea249d432eb03b22ee74a9b23b5e2009b
docs/ArcBlog-admin-ui-design.md     block#4  lines 506-522  3ff23301bad27627321198ade80539ba3a7f5a19c25350ae20d9ea3c63d2de6a
```

### 5.5 用到的辅助脚本（均在 `/tmp`，按约定不入仓库）

```js
// /tmp/ui008-blocks-full.mjs —— 抽出所有 ```js 块并逐个 sha256（块边界 = ```js … ```）
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const h = (s) => createHash('sha256').update(s).digest('hex');
for (const f of [process.argv[2], process.argv[3]]) {
  const lines = readFileSync(f, 'utf8').split('\n');
  const blocks = []; let cur = null;
  lines.forEach((l, i) => {
    if (/^```js$/.test(l)) cur = { start: i + 1, body: [] };
    else if (cur && /^```$/.test(l)) { blocks.push({ start: cur.start, end: i + 1, sha: h(cur.body.join('\n')) }); cur = null; }
    else if (cur) cur.body.push(l);
  });
  blocks.forEach((b, n) => console.log(`${f}\tblock#${n + 1}\tlines ${b.start}-${b.end}\t${b.sha}`));
}
```

### 5.6 改前基线的重建（可复现）

本轮开工前工作区 = HEAD `17aac1f` + UI-007 未提交的 3 行（V1.6 版本行 + §2.1「选中菜单项」「当前菜单项」）。重建命令：

```bash
$ git show HEAD:docs/ArcBlog-admin-ui-design.md > /tmp/ui008-base.md   # HEAD 快照（V1.5）
$ node /tmp/ui008-rebuild-base.mjs                                     # 把 UI-007 的 3 行从当前文件搬回 → /tmp/ui008-preround.md
$ diff /tmp/ui008-base.md /tmp/ui008-preround.md | grep -c '^[<>]'     # sanity：应 = 6（3 行改动）
6
$ diff /tmp/ui008-preround.md docs/ArcBlog-admin-ui-design.md          # = 本轮 UI-008 自身增量
# 13 insertions / 7 deletions（见 raw/UI-008-own-delta.txt）
```

---

## 6. 未决 / 移交（不属于 UI 写范围）

1. **`arc-contracts.md` §21.6 仍写「高 39px / 31px」**（第 848 行，与 §4.3 同源的旧测量）。本次 D2 只授权改 `docs/ArcBlog-admin-ui-design.md`；`arc-contracts.md` **不在 UI 写范围**（Lead/Dev 写）。标准与契约文档现在对按钮高度口径不同，建议 Lead 裁定同步（或把契约里该行改为「高度随字体度量，实测 en 36 / zh 38 / sm 29」）。
2. **V3 的令牌级方案（R12 设计项）**：D23 要求 R12 由 UI 给令牌级方案（加深危险色 / 文字改 `--color-text` / 只让描边与图标承担红色）。本轮只登记现状，**未改任何令牌**。
3. **侧栏页脚「滚动可达」未做浏览器实测**：§9 新判据（D24）**受限未验证**——本轮未跑 CDP 探针。逻辑上由 UI-007 的既有实测可推出（侧栏容器 `scrollHeight 916 > clientHeight 860` 且 `overflowY: auto`，页脚块是它的 `lastElementChild`），但**「滚动到底后页脚底边进入视口」这一步没有实测**。给 QA 的探针（admin 会话、1803×908、任取一控制台页）：

   ```js
   (() => {
     const nav = document.querySelector('[data-active="true"]')?.parentElement;
     if (!nav) return { error: 'no sidebar (guest?)' };
     const footer = nav.lastElementChild;
     const before = footer.getBoundingClientRect();
     nav.scrollTop = nav.scrollHeight;                       // 侧栏滚到底
     const after = footer.getBoundingClientRect();
     return { overflow: nav.scrollHeight - nav.clientHeight,
              firstScreenVisible: before.bottom <= innerHeight,   // D24：允许 false
              reachable: after.bottom <= innerHeight + 1 && after.top < innerHeight }; // D24：必须 true
   })()
   ```
4. **本轮范围外、按 Lead 裁定无需改标准（仅登记）**：
   * **D22（V2）**：gate 说明句 `intent=info` 4.49:1 → `intent=muted` 4.57:1 是**实现层**修复（Dev 的 `.aup/**`），标准 §3.1 已写「语义色禁用于装饰」+ AA 要求，**无需改文本**。
   * **D23（V3）**：见 §2.6（已写入标准）。
   * **D21①（页面 id）**：标准 §2.3 只写 `?page=<name>` 机制、**不写死节名**，`settings-general` / `general` 之争不影响标准文本；gate 的 `return_to` / `cancel_to` 指向真实页 id 属 BUG-021（QA/Dev）。
   * **D21②（六个 General 记录落 `config/{general,switches}/`）** / **D25（不补 `seed/settings/arcblog/**`）**：属存储与 seed 口径，标准 §3「只用 token、设置落库语义」不涉及，**无标准改动**。
   * **D20 / BUG-023（页面写入绕过 options → `language=fr` 进公开 RSS）**：P1 缺陷，属 Dev/QA，标准无对应条款，**无标准改动**。

---

## 7. 验收方式（每条可被 QA 独立复核）

| # | 断言 | 复现命令 |
| - | ---- | -------- |
| 1 | `§9` 条目数 = 12（未新增） | `grep -c '^□' docs/ArcBlog-admin-ui-design.md` |
| 2 | 4 个 ```js 断言块逐字节不变 | §5.4 / §5.5 脚本 |
| 3 | §3.3 出现 gate 卡 20px 豁免且引 Lead D4 | `grep -n '登录门（gate）卡豁免' docs/ArcBlog-admin-ui-design.md` |
| 4 | §3.3 出现 `auto-surface` 免责 | `grep -n 'auto-surface.*不受本节' docs/ArcBlog-admin-ui-design.md` |
| 5 | §4.3 尺寸档不再写死 39px/31px，含实测 36/38/29 | `grep -n '\| 尺寸档 \|' docs/ArcBlog-admin-ui-design.md` |
| 6 | §2.1 侧边栏内边距为 `8px 20px 8px 32px` | `grep -n '侧边栏样式 \|' docs/ArcBlog-admin-ui-design.md` |
| 7 | §2.5 写明「节数 ≥ 18 侧栏自滚可接受 / 页脚须可滚动到达」 | `grep -n '侧边栏不独立滚动' docs/ArcBlog-admin-ui-design.md` |
| 8 | §9 布局条含页脚可达判据（D24） | `grep -n '□ 布局：' docs/ArcBlog-admin-ui-design.md` |
| 9 | §4.3 记录 destructive 3.99:1 → R12 设计项 | `grep -n '已知现状 · destructive' docs/ArcBlog-admin-ui-design.md` |
| 10 | 通用门全绿 | §5.2（`arc dsl validate --json` / `npm test` / `console-nav --check` / `arc dsl generate --check`） |
| 11 | **受限未验证**：侧栏页脚滚动可达（浏览器层） | §6.3 探针（本轮未跑，原因已在 §6.3 写明） |
