# REQ-002 — 控制台一致性收口（UI-001 的 F1–F13）

**元信息**：REQ-002 ｜ 对应 spec 章节：**§15.1 后台信息架构 / §15.2 控制台外壳**（页面级依据 `docs/ArcBlog-admin-ui-design.md` §2.4 / §3.3 / §4.1 / §4.3 / §4.4 / §5.1 / §5.3 / §9）｜ checklist 行：无独立行——这是 **D 组已 ✅ 页面的实现质量缺口**（D 组 16✅ / 8🟡），来源为 UI-001 走查 ｜ 优先级：**P1（Round 6 续作；`blocked_by task-3`，若轮末无空位则顺延 Round 7）** ｜ 提出轮次：**Round 6** ｜ 负责角色：**Dev** ｜ 状态：已派发（任务 `task-5`，`blocked_by task-3`）

---

## 1. 背景

- UI 在 Round 6 用 **admin 会话 + 无 cookie guest 上下文**实测了 17 个控制台页面（证据快照 `git HEAD = b751d9f`，视口 1803×908），产出 14 条问题：**F1–F13 需 Dev**、**U1 已由 UI 实现并自测**（`.web/components/hero-carousel/style.css`）。完整现象、行号与测量配方见 **`docs/team/design/UI-001-console-tokens-and-walkthrough.md` §1 / §5**（本 REQ 直接引用，不重复抄写）。
- 这批**不是新功能**，而是已标记 ✅ 的页面在违反既有标准：
  - 文案串页（F1：`?page=posts` 游客登录卡写「运维 / Operations」）、
  - 主操作失去唯一性（F2：`?page=posts` 同屏 **30 个** `primary`，含 29 个行内 Publish 写操作）、
  - 空态是运行期英文 `No items to display`（F3，`emptyText` 不求值 `$t()` 的平台缺口，`arc-contracts.md` §20）、
  - 重复 `h2`（F4）、状态裸英文枚举无 i18n 无双编码（F5）、
  - **密度漂移**：17 页 gate 卡 + compose/compose-edit 12 张卡是 20px，与实测已统一的控制台 14px 冲突（F6）、
  - 本轮新标签页网格偏离固化配方（F7：`minmax(380px)` + `gap=md`，同仓正确先例 `heroes.aup:118` 是 `minmax(520px)` + `gap: 14px`）、
  - DID/哈希无截断无复制（F8）、侧栏无品牌页脚（F9）、时间口径不一（F10）、`?page=compose` 无页头（F11）、标签源字段纯手输（F12）、队列行动作名放大（F13）。
- 上游标准：[`docs/ArcBlog-admin-ui-design.md`](../ArcBlog-admin-ui-design.md) §9 是逐项验收清单；spec §15.1/§15.2 是信息架构依据。
- 关联：REQ-001（`?page=tags`）正在由 `task-3` 实现；F7/F12/F13 正落在该页上，因此本 REQ 的 Dev 任务必须 `blocked_by task-3`（**写范围完全重叠，必须串行**）。

## 2. 范围

### 2.1 做（逐条对应 UI-001 的 F 编号，验收见 §3）

| 组 | 条目 | 内容 |
| --- | --- | --- |
| 内容页 P1 | F1 | `?page=posts` 的 gate 文案改回内容页语义（`gate-title`/`gate-desc` 不再是「运维 / Operations」）；顺带核对另 16 页 gate 文案自指（`agents`/`media` 用运维组文案属可接受兜底，但页面须能看出是运维组） |
| 内容页 P1 | F2 | 列表行内 `Publish` 由 `primary` 降为 `secondary`：`posts.aup` 草稿行、`pages.aup` 离线行；页头保留唯一主操作。（`pages.aup` 的 create-offline 若为页头主操作则保留 `primary`——由 Dev 按「同屏恰 1 个」判定） |
| 内容页 P1 | F3 | 列表空态不再只留运行期英文：`dashboard.aup` 三条 `afs-list` 后各补一行 `intent=muted scale=sm` 本地化引导（与 `pages`/`agents`/`media` 现有写法一致）；`emptyText` 的抑制方案**必须先实测再合并**，未验证不得全站替换 |
| 内容页 P1 | F11 | `compose.aup` 补页头 `h2 :title` + `p :desc`（沿用 `compose-edit` 的 `fontSize: "var(--type-subheading)"`），i18n 块声明两键 |
| 密度 P1 | F6（D4 修订） | **只统一控制台内容卡**：`compose` / `compose-edit` 的 12 张内容卡 `var(--space-block, 16px)` + `gap=md` → `padding: "14px"` + `gap=sm`；其余控制台页内容卡已是 14px。**gate 卡豁免**（保持 20px，登录门 ≠ 内容卡）——原「17 页 gate 卡 20px→14px」一条按 Lead D4 裁定撤销。若引入单一来源变量，必须在回报里写明来源 |
| 结构 P2 | F4 | `appearance.aup` 同屏 **恰 1 个** 可见 `h2`（保留页面 `h2 :title` 或让 `auto-surface` 标题成为唯一，二选一） |
| 结构 P2 | F9 | `scripts/console-nav.mjs` 的 `sidebarLines()` 末尾追加固定页脚行（品牌 / 关于 / RSS / 版权，`marginTop:auto` 顶到底）+ `wrapper.*` 键写入 `.aup/wrapper.aup` + `node scripts/arcblog-console-nav.mjs` + `arc dsl generate --write`；`--check` 必须仍绿 |
| 结构 P2 | F10 | 缺时间的列表行补 `time mode=display`（字段以记录实际字段为准，避免渲染空值），口径与 `dashboard`/`operations`/`agents` 一致（§5.3 默认相对时间） |
| 数据 P2 | F5 | 状态改「色点 + 本地化文字」双编码：在所属页 `i18n {}` 声明 `status-*` 页面作用域 key；`posts`/`pages`/`hub`/`access`/`tags` 等页面不再出现裸 `published`/`archived`/`deleted`/`failed`/`pending`/`done` |
| 数据 P2 | F8① | 长标识（DID / 哈希 / 地址）做**中间截断 + `title` 承载完整值**（纯标记改动，低风险） |
| 标签页 P2 | F7 | `.aup/pages/site/tags.aup` 网格 `minmax(380px,1fr)` → `minmax(520px,1fr)`、`gap=md` → `style={gap: "14px"}` |
| 标签页 P2 | F12 | 源标签字段优先换 `searchable-dropdown`（选项来自标签投影，`arc-contracts.md` §25.1 列为已实现原语，**需先实测在控制台页可用**）；不可用则保留 `input`，但必须给出「现有标签见右侧列表」提示，并对不存在的标签给出明确提示（满足 REQ-001 A8） |
| 标签页 P2 | F13 | `.aup/pages/site/tags.aup` 队列行动作名 `scale=lg` → 默认档或 `sm`，字号不得大于同行 `status` |

### 2.2 明确不做

1. **不做 F8②「一键复制」入口**（本轮）：控制台无剪贴板原语（`arc-contracts.md` §25.1 已实现原语清单里没有复制类），候选方案是 `.web/components/copy-field/` 自定义组件 + `frame` 嵌入，而 `frame` 在控制台页内的尺寸/性能代价**尚未实测**（`arc-contracts.md` §14：frame 无 `style`、默认 200px 高）。等 Dev 给出实测数据后再立项；本轮只做 F8① 截断。本项列入 backlog 候选。
2. **不改业务逻辑、AFS 绑定、`replicated` 权限表、数据结构**；不改 `.web/**`（UI 写范围，U1 已完成）；不改 `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md` 状态列、`docs/ArcBlog-admin-ui-design.md`（D1 漂移由 Lead 裁定）。
3. **不重排控制台信息架构**：菜单分组与「分类与标签」归属（spec §15.2 菜单树 vs 现状）属 D2，由 Lead 裁定，不在本 REQ。
4. **不做 Q1 主题闪烁相关改动**：`seed/settings/arcblog/theme.json` + `.aup/app.aup` 一律不动，等 Lead 决策（UI 建议维持现状并记录）。
5. **不改 U1 已实现的 Hero 控件**（`.web/components/hero-carousel/style.css`），只做回归确认不回退。
6. **不为「更好看」重写既有页面**：只按 F1–F13 逐条收口；不在本 REQ 内新增功能、页面或数据。
7. 不做 D1–D4 的标准/口径修订（`admin-ui-design.md`、spec、`CLAUDE.md`、`roles/ui.md` 都不在 Dev 写范围）。

## 3. 验收标准

> 每条都是可观察行为或可复制命令。控制台断言在 **admin 会话**下访 `http://arcblog.localhost:4939/?page=<name>`；访客断言用**无 cookie 上下文**。测量表达式的权威出处是 UI-001 §5（本表给期望值与断言本身）。改了 `.aup/**` 必须附 `arc blocklet build`；标签页断言需先 `arc dsl generate --write` + `arc blocklet build` + 重启 daemon（UI-001 A19 已记录）。

**A1 通用门（必过）**
```bash
arc dsl validate --json                      # "issues": []
npm test                                     # 28/28 pass, exit 0
node scripts/arcblog-console-nav.mjs --check # exit 0
npm run test:file -- scripts/arcblog-console-nav.test.mjs
npm run test:file -- scripts/arcblog-runtime-ids.test.mjs
```
**A2 F1**：访客打开 `/?page=posts`，可见 `h2` **不含**「运维 / Operations」，为内容页语义（如 `Studio` / `创作者工作室`）。
**A3 F2**：admin 会话 `?page=posts`：
`[...document.querySelectorAll('button,a')].filter(el=>el.getBoundingClientRect().width>0 && el.getAttribute('data-variant')==='primary').length === 1`（当前 30）；同一断言在 `?page=pages` 也**必须 = 1**（该页 online 列表为空时容易假通过，需在有离线行时断言）。
**A4 F3**：`?page=dashboard` 在 Agent 授权为空时，英文 `No items to display` 之后**紧跟**一条本地化 dim 引导（或该英文文案消失）；`pages` / `agents` / `media` 同理不回退。
**A5 F11**：`?page=compose` 可见 `h2` 数量 = 1 且紧跟一句 `desc`。
**A6 F6（按 Lead 2026-09-27 D4 裁定修订）**：`?page=compose` / `?page=compose-edit` **内容卡** computed `padding === "14px"` 且 `rowGap === "10px"`（当前 20px/20px）；其余控制台页的**内容卡** `padding === "14px"`。**gate 卡（未登录登录门）豁免本口径，保持现状 20px**——它不是控制台内容卡，D4 已裁定不予统一；因此**不得**再要求「17 页 gate 卡 20px→14px」，静态复核口径相应改为「控制台内容卡里不再有 `padding: "20px"`（gate 卡的 `20px` 保留）」。

> **D4 裁定留档（Lead，2026-09-27）**：gate 卡豁免 14px 正文密度口径（登录门 ≠ 控制台内容卡）。本 REQ 其余条目不变；`task-5` 顺延 Round 7，开工前请以本节为准。
**A7 F4**：`?page=appearance` 可见 `h2` 数量 = 1。
**A8 F9**：任一控制台页侧栏底部出现品牌 / 关于 / RSS / 版权行（`marginTop:auto` 顶到底）；`node scripts/arcblog-console-nav.mjs --check` 与 `npm test` 全绿；新行文案来自 `wrapper.*`（`.aup/wrapper.aup` 声明 + locale 文件有中英两条）。
**A9 F10**：`?page=posts`（或其他列表页）每行出现相对时间文本（如 `3 days ago` / `3 天前`），且不存在因字段为空而渲染出的空 `time` 元素。
**A10 F5**：`?page=posts` 的 `document.body.innerText` **不再出现裸** `published` / `archived` / `deleted`；行内同时有色点与本地化状态文字（双编码）；`?page=hub` 不再出现裸 `failed`，`?page=access` 不再出现裸 `paid`，`?page=tags` 不再出现裸 `noop` / `done`（状态与动作名各自的 i18n key 已声明在该页 `i18n {}`，`npm test` 的死 key 门为绿）。
**A11 F8①**：节点标识渲染为中间截断形式（保留头尾），完整值在 `title` 中可见。
**A12 F7**：`?page=tags` 的 grid 容器 computed `grid-template-columns` 含 `520px`，`gap === "14px"`。
**A13 F12**：`?page=tags` 的源标签字段可从投影标签中选择（不是纯手输）——`searchable-dropdown` 经实测可用；若实测不可用，则保留 `input` 并同时满足：字段旁有「现有标签见右侧列表」提示，且输入不存在的标签时给出明确提示（REQ-001 A8）。**两条路径都必须在上报里写明选了哪条及实测证据。**
**A14 F13**：`?page=tags` 队列行动作名字号 ≤ 同行 `status` 的字号（不再 `lg` 放大）。
**A15 禁止项**：新增/改动页面无硬编码颜色：
```bash
grep -rnE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/ | grep -v '\.json' || echo "no hardcoded color"
```
期望输出 `no hardcoded color`；同屏 `primary` 数量、`h2` 数量等结构断言不回退。
**A16 回归（U1 不回退）**：
```bash
npm run test:file -- scripts/arcblog-hero-carousel.test.mjs   # 4/4
node scripts/arcblog-hero-carousel.mjs --check                # ok: true
```
**A17 受限项（如实标注，不得推断为通过）**：控制台的**写入类**断言（行内 Publish/删除点击后落库、标签队列 worker 执行）本轮由 QA 按 REQ-001 口径处理；若 guest 测试身份无法验证管理员写入面，须写「受限未验证 + 原因」。

## 4. 依赖

- **上游**：`task-2`（UI-001，已完成）→ `task-3`（REQ-001，已完成）→ `task-4`（QA 验证 REQ-001）→ 本 REQ（`task-5`，Dev）。
- **串行约束（必须同时满足）**：`task-5` 依赖 **`task-3` + `task-4`**。
  1. `task-3`：写范围完全重叠（`.aup/pages/**`、`scripts/console-nav.mjs`、`dist/**`），必须等标签页落地。
  2. **`task-4`（QA）必须先完成**：本 REQ 会重写 QA 正在验证的同一批 `.aup/pages/**` 文件；若 Dev 与 QA 并行，**验证目标会在 QA 脚下移动**（QA 报告将无法对应任何确定 revision）。PM 已请求 Lead 把 `task-4` 加入 `task-5` 的 `blocked_by`（任务板依赖只能由 owner/Lead 改）；在依赖补齐前，**任何人不得叫醒 Dev 开工 `task-5`**。
- **F7/F12/F13** 作用在 `task-3` 新交付的 `.aup/pages/site/tags.aup` 上；若 Dev 在 `task-3` 内已顺带满足，验收时只需复核并在回报里指明，不重复改动。（复核结论：`task-3` 交付时 tags 页仍为 `minmax(380px,1fr)` + `gap=md`、源字段为 `input`、动作名 `scale=lg`，三条均**待 `task-5` 收口**。）
- **已升级 Lead、不在本 REQ 范围**：D1（`admin-ui-design.md` §2.3/§2.5/§2.1/§8/§9 与 B′ 实现漂移）、D2（spec §15.1/§15.2 停留在 hash 版控制台）、D3（「15/16/17 页」与 `lint` 计数 24/10 两处口径漂移，建议改为以 `CONSOLE_SECTIONS.length` 与实测为准）、D4（「控制台统一 14px」口径与 gate 卡 20px 并列陈述）、D5（`task-3` 实测的 6 条平台事实待写入 `docs/arc-contracts.md`，仅 Lead 有写范围）、Q1（`theme=system` + `mode light` 的 ~300ms 闪烁取舍，UI 建议维持现状并记录）。
- **外部条件**：无链上依赖；需要可写 dev 实例；标签页浏览器验证需要 daemon 重启（`arc dsl generate --write` + `arc blocklet build`）。

## 5. 涉及写范围

| 路径前缀 | 用途 | 归属 |
| --- | --- | --- |
| `.aup/pages/admin/{posts,pages,compose,compose-edit,appearance,dashboard}.aup` | F1–F6、F8①、F10、F11 | Dev |
| `.aup/pages/site/{tags,categories,heroes,seo,feeds}.aup` | F5/F6/F7/F10/F12/F13 同形改动 | Dev |
| `.aup/pages/ops/*.aup`、`.aup/pages/economy/*.aup` | F3/F5/F6/F10 同形改动 | Dev |
| `.aup/wrapper.aup` | F9 新增 `wrapper.*` 页脚键（手写项） | Dev |
| `.aup/locales/*.json` | 由 `arc dsl generate --write` 生成，不手改 | Dev（生成） |
| `scripts/console-nav.mjs` + `node scripts/arcblog-console-nav.mjs` | F9 侧栏页脚 + 全页重生成 | Dev |
| `dist/**` | `arc blocklet build` 生成，不手改 | Dev |
| `docs/team/design/**`、`.web/**` | UI-001 提案与 U1（已完成） | UI |
| `docs/team/requirements/**`、`journal/**`、`backlog.md` | 本 REQ / 轮次日志 / 看板 | PM |
| `docs/ArcBlog-admin-ui-design.md`、`docs/ArcBlog-product-technical-spec.md`、`CLAUDE.md`、`docs/team/roles/ui.md` | D1–D4 标准/口径修订 | **Lead 裁定后**（本轮无人可动） |

**边界**：本 REQ 不授权改 spec、不改 checklist 状态列；D1–D4/Q1 由 Lead 裁定。
