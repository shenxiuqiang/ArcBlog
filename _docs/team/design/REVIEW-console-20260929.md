# REVIEW-console-20260929 — 管理后台（控制台 21 页）设计审查

| 字段 | 值 |
| ---- | -- |
| 任务 | `task-23`（[UI-REVIEW] 设计师审查管理后台）· 单人模式（`docs/team/bootstrap.md` §11.1） |
| 审查人 | platform-researcher（临时以 UI/UE 设计师身份执行，见 `docs/team/roles/ui.md` §8） |
| 日期 | 2026-09-29（观测窗口 17:52–18:0x CST） |
| 范围 | 控制台 21 页（`?page=<name>`，节数取自 `scripts/console-nav.mjs` = `CONSOLE_SECTIONS.length` = **21**，另含子页 `compose-edit`） |
| 判据 | `docs/ArcBlog-admin-ui-design.md` §1 / §2.3 / §2.5 / §2.7.1–§2.7.7 / §9 / 附录 A.3–A.4；spec §15.2；平台事实取 `docs/arc-contracts.md` §19/§20 与 `.agents/skills/aup-dsl/SKILL.md:66` |
| 结论 | **P0 = 0**；P1 = 4；P2 = 4；P3 = 1（表共 9 条，≤10） |
| 提案 | P1 各开一份：UI-019 / UI-020 / UI-021 / UI-022 |

## 0. 方法与证据来源（可复跑）

```bash
# 七项预算（唯一数字来源，22 行 = 21 页 + compose-edit）
node scripts/arcblog-ui-budget.mjs --json
node scripts/arcblog-ui-budget.mjs --strict >/dev/null; echo "strict exit=$?"   # → 1（13 页超限）

# 唯一的浏览器方式（headless，不抢焦点）
node scripts/arcblog-browser-probe.mjs 'http://arcblog.localhost:4939/?page=media' --json \
  --screenshot docs/team/design/screenshots/review-media.png

# 只读门（跑过，均 ok=true）
arc dsl validate --json      # ok: true
arc dsl lint --json          # ok: true, warningCount: 0
```

本轮 7 页（A 层）的探针与截图（全部 guest 会话，`aupNodes=11`，`sessionInitFailed=false`）：

| 页面 | 探针可见文本（`text`） | 截图 |
| ---- | ---------------------- | ---- |
| dashboard | `ArcBlog / 仪表盘 / 使用 DID Wallet 登录后查看待处理的草稿与已发布内容。/ 使用 DID Wallet 登录` | `screenshots/review-dashboard.png` |
| posts | `ArcBlog / 创作者工作室 / …管理草稿、已发布文章与媒体。` | `screenshots/review-posts.png` |
| compose | `ArcBlog / 用钱包发布 / …登录以解锁编辑器。草稿保存在私有草稿目录中，直到发布。` | `screenshots/review-compose.png` |
| compose-edit | **与 compose 逐字相同** | `screenshots/review-compose-edit.png` |
| hub | `ArcBlog / Hub 管理 / …管理 Studio 收录与内容索引。` | `screenshots/review-hub.png` |
| media | `ArcBlog / 运维 / 使用 DID Wallet 登录后查看媒体索引。` | `screenshots/review-media.png` |
| diagnostics | `ArcBlog / 诊断 / 使用 DID Wallet 登录后查看本实例的自检结果。` | `screenshots/review-diagnostics.png` |

> **登录态限制（如实标注）**：guest 会话只能看到门禁卡。凡涉及**登录后**的渲染（内容列布局、`data-active` 运行时值、§2.6 等价断言、§9 的对比度/命中区断言、两视口响应式）本轮**未跑**，报告中一律标「受限未验证」，只做静态判定。
> **静态判定的平台依据**：`arc-contracts.md` §20（`emptyText` 运行期不求值）、`arc-contracts.md` §19（`state={value:…}` 不插值）、`.agents/skills/aup-dsl/SKILL.md:66`（`h1 h2 h3 p` 全部渲染为 `DIV.aup-text`）。

---

## 1. 审查表（按优先级排序，共 9 条）

| # | 对象 | 现象 + 证据 | 违反的条款 | 影响 | 建议 | 归属 | 优先级 |
| - | ---- | ----------- | ---------- | ---- | ---- | ---- | ------ |
| 1 | `?page=posts`、`?page=hub`（本波 7 页中的 2 页）· 内容区预算 | `node scripts/arcblog-ui-budget.mjs --json` → `posts`: `styles=13`（限 **8**）；`hub`: `styles=15`（限 **8**）、`i18n=26`（限 **25**）；`--strict` 退出码 **1**。**根因不是随手加样式，是 §4.3 强制要求的药丸半径覆盖被逐 action 重复内联**：`style={borderRadius: "var(--radius-md, 8px)"}` 在 `posts.aup:168,197,198,219,220,241,242`（内容列 7 处）与 `hub.aup:159,181,182,183,207,224,228`（内容列 7 处）各出现 7 次。逐项相减：posts `13−7=6` ✅、hub `15−7=8` ✅（hub 的 `i18n` 还需再减 1 键） | §2.7.2（内联 `style` ≤8，**超限 = 不通过**）；§9「预算（§2.7.2）…七项全部不超限」；§2.7.7（同一段式样重复 7 次却未生成）；**与 §4.3「必须内联覆盖」（`:445`）直接冲突** | 本波宣称重构完成的 7 页里有 2 页**未通过 §9 验收清单**；棘轮基线（`scripts/ui-budget-baseline.json`）把这 2 页钉在超限值上，后续任何改动都会被判"更差" | 把半径覆盖从"逐 action 内联"上移到主题层一条 CSS（**先例**：UI-010 的 destructive 按钮覆盖走 `.web/components/theme-bridge/` 的 `CHROME_CSS`，`.aup` 零改动、回退=删几行），再删两页共 14 处内联；hub 另删 1 个 i18n 键。**该做法的前提是 §4.3 那句"必须内联覆盖"要改准** → 升级 Lead（待裁决点 1） | 需 Dev（`.aup/**`）+ 标准（Lead） | **P1** |
| 2 | `?page=media` 门禁卡标题 | 探针 `text` = `ArcBlog / **运维** / 使用 DID Wallet 登录后查看媒体索引。`；截图 `docs/team/design/screenshots/review-media.png`（可见标题「运维」）。源码：`media.aup:8 gate-title { en "Operations" zh "运维" }` vs `media.aup:20 title { en "Media" zh "媒体" }`。而「运维」是**另一个页面**的侧栏标签（`wrapper.nav-operations = 运维` → `?page=operations`；本页侧栏标签是 `wrapper.nav-media = 媒体`） | §2.4（页头 = 标题 + 一句话说明；标题必须指本页）；§9「页头：标题 + 一句话说明 + 至多一个主操作」；§1「一致」 | guest 打开 `?page=media` 看到标题「运维」，与右侧说明"查看媒体索引"自相矛盾，且与侧栏里另一个页面重名 → 用户会以为自己进错了页 | `gate-title` 改为与 `title` 同源（`Media` / `媒体`）；若采纳 §2.7.7 的生成器，则门禁卡标题**从 `title` 派生**，从根上消除这类漂移 | 需 Dev（`.aup/**`） | **P1** |
| 3 | `?page=compose-edit` 门禁卡文案 | `compose-edit.aup:27-28`：`p "$t(compose.gate-title)"` / `p "$t(compose.gate-desc)"` —— **跨页引用 compose 的 key**（本页 `i18n{}` 里没有 `gate-title`/`gate-desc`）。后果可复现：探针 `?page=compose-edit` 与 `?page=compose` 的 `text` **逐字相同**（"用钱包发布 / 使用 DID Wallet 登录以解锁编辑器。草稿保存在私有草稿目录中，直到发布。"）。另：7 页中唯一不用 `h2 :gate-title` 的一页（其余 6 页均 `h2 … level=2`） | §2.7.4（单一用途：页面说明必须是一句回答"操作者在这里干什么"的话）；§9 页头条；CLAUDE.md「`$t(page.key)` 写在**别的**页面里 = 引用但未声明」（平台 i18n 事实） | 从 `/edit/<slug>`（记录绑定页面，`/edit/<slug>` 新标签页打开）进入的编辑页，guest 看到的是**新建文章**的文案，读不出"这是编辑既有草稿" | 在 `compose-edit` 自己的 `i18n{}` 声明 `gate-title`/`gate-desc`（如 "Edit post / 编辑文章" + "登录后编辑这篇草稿"），并把 `p … level="2"` 改成与其余 6 页一致的 `h2`。注：`h2`/`p` 在 DOM 层都渲染为 `DIV.aup-text`（`aup-dsl/SKILL.md:66`），所以这是**源码一致性**问题，不是可访问性回归 —— 不要按 a11y 缺陷上报 | 需 Dev（`.aup/**`） | **P1** |
| 4 | `?page=dashboard` 空状态 | 页面的**唯一"下一步"指引放在了 `emptyText` 里**：`dashboard.aup:155 emptyText=:drafts-empty`（key = "No drafts waiting. Use “Write a post” above to start one."，声明在 `dashboard.aup:9`）；`:176 emptyText=:content-empty`（`dashboard.aup:4`，只有现状、无动作）。平台事实：`arc-contracts.md` §20 实测 `emptyText=:key` 编译成 `$t(…)` 后**运行期不求值**，空列表渲染运行时默认英文 "No items to display" ⇒ 这两条文案**看不见**。同仓已有正确范式：`media.aup:15 media-standing-note`、`pages.aup:33 queue-empty-note` 都用**页面级常驻说明**承载 | §4.4（空状态 = 一句现状 + 一句价值 + 一个动作，**永远给出下一步**）；§9「状态：空状态有引导和动作」 | 新节点首次登录、`drafts/` 为空时，用户看不到「用上方的『写文章』开始一篇」这条指引 → §9 要求的空态动作缺失；`posts` 页用 `status-note` 常驻说明绕过了同一平台缺口，`dashboard` 没有 | 保留 `emptyText`（无害），另加一张页面级常驻说明卡，内含指向 `?page=compose` 的动作；文案走本页 `i18n{}`。若 §2.7.7 生成器落地，可做成通用"空态说明"块一次解决 21 页 | 需 Dev（`.aup/**`） | **P1** |
| 5 | 全 21 页 · 原型声明（§2.7.1） | **21 个控制台页里只有 6 个声明了 P1–P5**。页面顶部注释：`dashboard.aup`、`posts.aup:1`、`hub.aup:37`、`media.aup:131`；`.aup/man/*.yaml` 的 `synopsis`：`dashboard.yaml:9`、`compose.yaml:8`、`compose-edit.yaml:9`、`diagnostics.yaml:9`、`media-admin.yaml:9`。⇒ 有声明 = dashboard / posts / compose / hub / media / diagnostics（**6/21**，`compose-edit` 是子页已声明）；**无声明 15 页**：pages / heroes / categories / tags / seo / feeds / appearance / operations / agents / orders / policy / access / ledger / factory / general。佐证：`.aup/man/{categories-admin,heroes-admin,policy-admin,general,economy-admin,agent-admin,pages-admin,feeds-admin,access-admin,ops-admin}.yaml` 仍是 `# … Fill in description/synopsis/examples/flows` 的占位注释 | §2.7.1「**任何**控制台页面**必须先声明**属于下列 5 个原型之一」 | 这 15 页无法判定"骨架是否与原型一致"，也无法判定 §2.7.1 禁止的"列表 + 表单 + 状态 + 命令"混装是否存在；§9 的"原型"一条对这些页不可执行 | **不建议一轮补 15 页**：随下一波重构逐页补（每页一行注释即可），并在 §9 清单里把"已声明原型"变成可检查项 | PM 排期 / 需 Dev | P2 |
| 6 | 全 21 页 · 「高级」折叠机制 | 现存**两套**折叠机制：**①平台页签 `view mode=tabs`** 5 页 —— `admin/compose.aup:154`、`admin/compose-edit.aup:66`、`admin/diagnostics.aup:141`、`admin/posts.aup`、`ops/media.aup`；**②手写显隐 `action -> set <x> state {open: …}`** 5 页 —— `ops/hub.aup:207,228`、`admin/pages.aup`、`economy/policy.aup`、`ops/factory.aup`、`site/categories.aup`。`hub.aup:38` 的注释自称遵守 §2.7.3，用的却是第 ② 种 | §2.7.3「折叠的落地顺序：① 平台 `view mode=tabs`（实测可用）② 独立高级页 ③「复制行」」—— 手写 set-state 折叠**不在序列内**；§1「一致：同样的操作用同样的模式触发」 | 同一个控制台里"高级"有时是页签、有时是按钮展开：位置、外观、记忆状态（手写 `open` 不会随页面切换重置）都不同，用户对"高级在哪"形成不了稳定预期 | 二选一并写进标准：**A** 全部改 `view mode=tabs`（5 页重写，且与 §2.7.7 生成器天然兼容）；**B** 把"手写显隐折叠"登记为合法机制 ②′（改标准，零页面改动）。见待裁决点 2 | 标准（Lead）+ 需 Dev（若选 A） | P2 |
| 7 | `?page=posts`、`?page=diagnostics` · 页面命名 | **同一个页面出现多个名字**。posts：侧栏 `wrapper.nav-studio` = 工作室 / Studio → 门禁 `posts.aup:15` = 创作者工作室 / Studio → 页头 `posts.aup:18` = 你的工作室 / Your studio（**3 个名字**）。diagnostics：侧栏 `wrapper.nav-diagnostics` = 诊断与维护 / Diagnostics → 页头 `diagnostics.aup:3` = 诊断 / Diagnostics（2 个）。对照（正确）：dashboard 三处都是"仪表盘 / Dashboard"，hub 三处都是"Hub 管理 / Hub console" | §1「一致：同样的信息用同样的方式呈现」；§2.4（标题不说废话）；§9 页头条 | 侧栏点「工作室」、页头写「你的工作室」、门禁写「创作者工作室」——用户需要自己确认是不是同一页；英文侧栏 `Studio` 与页头 `Your studio` 也对不上 | 定一条硬规则：**侧栏标签 = 页头标题 = 门禁卡标题**（中英各一份），差异只允许出现在**说明句**里。这条规则目前标准里没有（§2.4 只要求标题不重复说明）→ 同时是标准缺口 | 标准（Lead 补条款）+ 需 Dev | P2 |
| 8 | 全 21 页 · 门禁卡 + 内容列骨架 | §2.7.7 的生成器目标**未达**：门禁卡块在 21 个页文件里逐字重复 —— `dashboard.aup:20-24`、`posts.aup:59-63`、`compose.aup:26-30`、`hub.aup:43-47`、`media.aup:28-32`、`diagnostics.aup:31-35`（其余页同形）；唯一变体是 `compose-edit.aup:26-31`（即第 3 条的缺陷）。生成器 `scripts/arcblog-console-nav.mjs` 目前**只生成侧栏**（进 `npm test` 的 `--check` 漂移门） | §2.7.7「同一段结构出现在 **≥3 个页面** → 必须由生成器产出并挂 `--check` 漂移门，不允许手抄」；§2.7.7 表格自己把「登录门禁卡 + 内容列骨架」的目标写成"纳入同一生成器" | 21 份副本必然手工漂移 —— 本报告第 2、3 条的缺陷**正是漂移产物**；门禁卡任何改动要改 21 处，漏一处就又多一个 §2.7.1 级不一致 | 按 §2.7.7 自己的纪律推进：①先在 1 页试点 ②生成块与手写块留显式锚点 ③**单独一次交付**（不与页面重构混在一起，否则 before/after 无法归因）；把第 2、3 条一并收进这次生成器改动 | 需 Dev（单独交付） | P2 |
| 9 | 13/22 页仍超 §2.7.2 预算（B 层索引） | `node scripts/arcblog-ui-budget.mjs --json`：**22 页里 13 页超限**（`--strict` 退出 1）。逐页最严重项见下面 §2 附录。任务描述里的"11 页"与实时不符：**本波重构的 `posts` 与 `hub` 也在超限名单里**（第 1 条） | §2.7.2（七项硬上限）；§9 预算条 | 详见 §2 附录逐页一行 | 逐页按 §2.7.1 原型收敛；先做本波 2 页（第 1 条），再按 `over` 项数从多到少排期 | PM 排期 | P3 |

---

## 2. 附录 B：超预算页索引（13 页，实时数字；不做深挖）

命令：`node scripts/arcblog-ui-budget.mjs --json`（内容列口径；限值 = 区块 3 / 卡片 2 / **嵌套 0** / 可控 12 / 内联 style 8 / i18n 25 / 技术标识 2；P3 编辑页豁免为 16 / 12）。

| 页面 | 超限项 → 实测/限 | 最严重的 1–2 条 | 该长什么样（§2.7.1 原型骨架，一句话） |
| ---- | ---------------- | --------------- | ------------------------------------- |
| `policy` | cards 5/2 · ctrl **28**/12 · styles **43**/8 · i18n **94**/25 · tech 19/2 | 单页塞了策略 + 商品 + 访问 + 队列；可控元素 28（限 11 倍） | **P4 设置**：页头 → **1 张卡（字段 ≤8）**，多出来的商品/访问各归其页 |
| `general` | cards 5/2 · styles 38/8 · i18n 96/25 · tech 17/2 | 15 个 `h3` 平铺 + 5 张卡 | **P4 设置**：3 行字段 + 开关列表 + 初始化，`h3` 收成字段行 |
| `orders` | cards 5/2 · styles 21/8 · i18n 59/25 · tech 14/2 | 18 个原始字段标签与列表同屏 | **P1 列表**：页头 → **恰好 1 个订单列表**；原始字段与 CLI 折进「高级」 |
| `ledger` | cards 6/2 · styles 21/8 · i18n 48/25 · tech 14/2 | 账本 + 结算 + 只读/paging/CLI 三块平铺 | **P1+P5**：账本卡 + 结算卡；只读与 CLI 折进「高级」 |
| `factory` | cards 6/2 · styles 26/8 · i18n 73/25 · tech 4/2 | 6 张卡，其中 `factories`/`truth` 的数据在高级区已有副本 | **P5 运维**：删重复两卡；保留 NFT + 4 个动作 + 队列 |
| `agents` | cards 5/2 · styles 19/8 · i18n 40/25 · tech **20**/2 | 19 个工具目录 + 策略 + 授权同屏 | **P5（降级）**：页头 + 1 张策略摘要 + 授权列表；工具目录折进「高级」 |
| `categories` | cards 5/2 · styles 26/8 · i18n **56**/25 · tech 12/2 | 列表 + 新增 + merge/迁移 + 队列 + CLI 全平铺 | **P1 列表**：列表（行内 merge/迁移删除）+ 1 张新增卡；队列与 CLI → 高级 |
| `tags` | cards 4/2 · styles 24/8 · i18n 37/25 · tech 6/2 | 快照 + 列表 + 表单 + 队列 | **P1 列表**：快照 + 列表 + 1 张表单卡；队列 → 高级 |
| `heroes` | cards **5**/2 · ctrl 13/12 · styles 27/8 · i18n 27/25 | 5 张卡（新增表单 / 快捷 / dropzone 各一张） | **P1 列表**：标题 + 列表卡 + **1 张新增卡**（表单+快捷+dropzone 合并） |
| `pages` | styles 23/8 · i18n 38/25 · tech 5/2 | 创建卡 + 两个列表 + 队列 + CLI | **P1 列表**：创建卡 + 1 个列表（行内动作） |
| `operations` | cards 4/2 · styles 15/8 · tech 4/2 | 健康 KV 与 `dashboard` 逐字重复（§2.7 前言已点出） | **P5 运维**：折成**1 张"节点状态"卡**；Hub 列表归还 `hub` |
| `posts` | styles 13/8 | 见第 1 条（半径覆盖 ×7） | **P1 列表**：页头 → 1 个列表（页签=数据视图）→ 空态；生命周期动作收进行菜单 |
| `hub` | styles 15/8 · i18n 26/25 | 见第 1 条（半径覆盖 ×7 + 1 个多余 i18n 键） | **P1+P5**：关系卡 + 索引卡；3 段 CLI 与队列折进「高级」 |

**已达标的 9 页**（可当范式）：`dashboard`、`compose`、`compose-edit`、`seo`、`feeds`、`appearance`、`media`、`access`、`diagnostics`。
其中 `feeds` / `appearance` / `access` 三项极简，最适合作为 P4/P1 的抄写模板（§2.7 前言已这么建议）。

---

## 3. 标准缺口清单（找不到条款可落，单独列出，不藏在正文）

| # | 缺口 | 现象 | 引用 | 建议 |
| - | ---- | ---- | ---- | ---- |
| G1 | **§4.3 与 §2.7.2 直接冲突** | §4.3「圆角…必须内联覆盖」（`:445`）要求每个 action 写一处内联 `style`；§2.7.2 又把内联 `style` 上限压到 8。列表型页面（`posts` 7 个行内动作、`hub` 7 个）**无论如何都会超限** | `admin-ui-design §4.3:445` vs `§2.7.2:278` | 二选一：把覆盖上移到主题 CSS（有先例 UI-010），或把 §2.7.2 的内联 `style` 口径改成"**排除平台 required 的覆盖**"。**必须改标准 → 待裁决点 1** |
| G2 | **§2.7.3 未登记"手写显隐折叠"** | 5 页用 `action -> set <x> state {open: …}` 做高级折叠，标准只列了 ①`mode=tabs` ②独立高级页 ③复制行 | `§2.7.3:292` | 要么把它补成合法机制 ②′，要么明文禁止 → 待裁决点 2 |
| G3 | **没有"页面名称唯一"的硬条款** | 同一页在侧栏/门禁/页头可以有 3 个名字（`posts`）；门禁标题甚至可以写另一个页面的名字（`media` 写"运维"）。§2.4 只要求"标题不说废话"，无法判"名字不对" | `§2.4:148`、`§9:679` | 补一条可断言规则：侧栏标签 = 页头标题 = 门禁卡标题 |
| G4 | **§4.4 与 arc-contracts §20 没有连起来** | 标准正文要求"空状态永远给出下一步"，平台又实测 `emptyText` 不求值 —— 但标准正文没写"空态指引**不得**放在 `emptyText`，必须落在可见元素" | `§4.4:455`、`arc-contracts §20:745` | 在 §4.4 加一句平台约束 + 反例（`dashboard`） |
| G5 | **§2.7.1 的"之一"与多原型声明** | `hub`、`media` 声明 "P1 + P5"；而 §2.7.1 说"必须先声明属于下列 5 个原型**之一**"并禁止混装。标准没说多原型声明算不算混装 | `§2.7.1:254,264` | 明确定义"P1+P5 组合"是否合法（若合法，把两套骨架的组合写清；若非法，给出拆分规则） |
| G6 | **§2.7.7 只按"跨页重复"计数，不管"同页重复"** | `posts`/`hub` 各自在同一页重复同一段内联样式 7 次，不触发"≥3 个页面"的生成规则 | `§2.7.7:324` | 补一条"同一页同一段结构 ≥5 次即须抽为共享件/主题样式" |

---

## 4. 本轮未覆盖范围（诚实标注）

1. **B 层只做了索引**（第 9 条 + §2 附录）：13 页每页给了预算数字与一行目标，**没有**逐页读源码、**没有**逐页截图（时间/范围所限）。
2. **C 层的运行时部分未验证**（guest 只能看门禁卡）：登录态的内容列布局、`data-active` 运行时值、§9 的"点击去向等价断言"、对比度断言与命中区断言（§9 末两条）、以及 §9 的侧栏滚动可达页脚判据 —— 全部标「受限未验证」，只做了**静态**判定（侧栏 `active=true` 每页恰好 1 处已静态确认：21/21 页各 1，`compose-edit` 0 且它不是 21 节之一）。
3. **响应式**：探针只跑了一个视口（756×469 的 headless 窗口），1803×908 / 1512×765 两视口未跑 → 未覆盖。
4. **公共站点页、分享卡片、`.web/**` 主题与 hero-carousel** 不在本轮范围（人类指令限定"管理后台"）。
5. **i18n 语言覆盖**：只核对了中英两份 key 的存在性与语气（`arc dsl lint` 报 `ok: true`、`dead_locale_keys` 0），未做逐页中英布局宽度验证（需登录态）。
6. **未做**：不改任何源码、不 build、不部署、不重启实例、不开 headed 浏览器、不 commit —— 见本次回报的 `git status --short`。

---

## 5. 需要 Lead 裁决的点（含候选 A/B）

### 裁决点 1 — §4.3 强制内联覆盖 vs §2.7.2 内联 style ≤8（对应第 1 条，P1）
- **候选 A（推荐）**：把"控制台按钮统一 `var(--radius-md, 8px)`"从逐 action 内联改为**主题层一条 CSS**（落点与 UI-010 的 destructive 覆盖相同：`.web/components/theme-bridge/` 的 `CHROME_CSS`），随后删掉 `posts`/`hub` 各 7 处内联，并修订 §4.3「必须内联覆盖」的措辞。
  - 数字验证：`posts 13−7=6`、`hub 15−7=8`，均回限内；hub 再删 1 个 i18n 键即七项全绿。
  - 风险：`CHROME_CSS` 是全局注入，需按 §4.3 的"运行时默认不一致（primary 8px / secondary·ghost 32px）"精确限定选择器；属 Lead 门（validate + 快层 + build）。
- **候选 B**：不动实现，改标准 —— §2.7.2 的内联 `style` 计数**排除平台强制覆盖**（`borderRadius`）后判定。
  - 风险：预算口径变复杂、棘轮基线要重录，且未来同类"平台补丁式内联"会持续膨胀；只治标。
- **建议**：选 A，并把 G1 写进标准维护记录。

### 裁决点 2 — 「高级」折叠是否统一到 `view mode=tabs`（对应第 6 条，P2）
- **候选 A**：全部改 `view mode=tabs`，删手写 `state {open}`（5 页重写；与 §2.7.7 生成器兼容，因为页签是纯结构）。
- **候选 B**：把"手写显隐折叠"登记为标准合法机制 ②′（0 页面改动，只改标准）。
- **建议**：A 更符合 §1「一致」与 §2.7.3 的"落地顺序"原意；但如果本轮只做本波 2 页（第 1 条），可先落 B 作为过渡并在下一波收敛。

### 裁决点 3 — `media` 门禁标题怎么修（对应第 2 条，P1）
- **候选 A**：`media.aup:8` 直接改成 `Media/媒体`（一处改动，立即可验）。
- **候选 B**：与 §2.7.7 生成器一起做，门禁卡标题从 `title` **派生**（顺带修掉 `compose-edit` 的跨页引用），代价是必须等生成器那一轮。
- **建议**：A 先止血（P1、一行），B 作为生成器交付的一部分。

### 裁决点 4 — 15 页缺失的原型声明怎么补（对应第 5 条，P2）
- **候选 A**：随下一波重构逐页补（每页一行注释），成本摊薄，但 15 页"混装"风险在补完前一直不可判定。
- **候选 B**：一次性补 15 处声明（纯注释/`synopsis`，无需改结构），立刻让 §9 的"原型"一条可执行。
- **建议**：B 成本极低（不改骨架），推荐先做；骨架收敛仍按波次推进。

### 裁决点 5 — 是否有 P0
- **本轮无 P0**：没有发现"阻断主链路、或资金/数据风险"的界面缺陷。最严重的 P1（第 2 条 `media` 门禁标题错页名）只造成认知错位，不阻断任务完成；第 1 条的预算超限属"未通过验收清单"，也不阻断使用。
- 若 Lead 认为"未通过 §9 验收清单"本身就该按 P0 处理，请明确 —— 那样第 1、2 条会升级并触发当轮上报人类。

---

## 6. 提案索引

| 提案 | 对应条目 | 标题 | 优先级 | 实现方 |
| ---- | -------- | ---- | ------ | ------ |
| [UI-019](UI-019-console-wave-page-budget.md) | 1 | 本波 2 页（posts / hub）预算回归：半径覆盖上移主题层 | P1 | 需 Dev + 标准（Lead） |
| [UI-020](UI-020-media-gate-title.md) | 2 | `?page=media` 门禁卡标题写成了另一个页面（"运维"） | P1 | 需 Dev |
| [UI-021](UI-021-compose-edit-gate-copy.md) | 3 | `?page=compose-edit` 门禁卡借用 compose 文案、不言明"编辑" | P1 | 需 Dev |
| [UI-022](UI-022-dashboard-empty-guidance.md) | 4 | `?page=dashboard` 空态指引落在 `emptyText` 上（平台不求值）→ 空态无下一步 | P1 | 需 Dev |

P2/P3 条目（第 5–9 条）本轮**只出审查结论，未开提案**，按 `bootstrap.md` §11.2 由 Lead 决定是否转实现任务。
