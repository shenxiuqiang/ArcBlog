# REQ-004 — 控制台 Round 7 遗留缺陷收口（BUG-005 / BUG-006 / BUG-009）

**元信息**：REQ-004 ｜ 对应 spec 章节：**§15.1 后台信息架构 / §15.2 控制台外壳 / §107–§109 节点身份**（页面级依据 [`docs/ArcBlog-admin-ui-design.md`](../ArcBlog-admin-ui-design.md) §4.1 状态指示 / §4.3 按钮层级 / §4.4 空状态 / §5.1 标识 / §5.4 / §9 验收清单）｜ checklist 行：D 组「概览 Dashboard」「Hub 管理」「分类与标签管理界面」——**本项不改状态列**（缺陷是质量缺口，不是功能缺失）｜ 优先级：**P2**｜ 提出轮次：**Round 7（PM 裁决轮）**｜ 负责角色：**Dev**｜ 状态：**草案 · 已评估排队（🟨）· 未派发**——开工前需 **D6 口径裁定**；因无任务板任务，**不满足 backlog 进入 🟥 的硬条件**（`roles/pm.md` §3.1）

---

## 1. 背景

- Round 7 的两项交付（REQ-002 控制台一致性收口、REQ-003 界面标准事实对齐）经 QA 独立验收**放行**（[`test-reports/round-7.md`](../test-reports/round-7.md)，`VERDICT=pass` / `BLOCKING=0`），但 QA 新增了 5 条 BUG：**P2×3 + P3×2**（无 P0/P1）。本轮按 Lead 指示**不触发修复/复验流程**，PM 已把 5 条全部裁决为「下一轮修」（见 [`backlog.md`](../backlog.md) 🐞 区）。
- 本 REQ 承接其中 **Dev 侧的 3 条 P2**（P3×2 的文档漂移由 UI 走 REQ-003 续作，写范围不重叠）：
  1. **BUG-005（P2）**：REQ-002 F5 的「色点 + 本地化状态文字」双编码退化成**常量类别词**——`?page=posts` 草稿区 26 条 `deleted` + 1 条 `draft` 全部显示「In drafts」；`?page=tags` 的 `pending`/`done`/`noop`/`failed` 四态同一句「Queued intent」；`?page=dashboard` 的 `paid`→「Order」；`?page=hub` 三态同词且 `freshness` 仍以裸英文 `offline` 出现；`?page=access` 行连状态词都没有。真实值只剩色点 `title`（hover 才可见）→ 违反 UI 标准 §4.1（第 284 行「状态点与文字必须同时出现」）与 §9 第 6 条「双编码：状态不只依赖颜色」（第 438 行）。**已知限制**：`visible` 只支持同步 `$session.*`（`arc-contracts.md` §28.1）、`afs-list.emptyText` 四种写法全无效（§28.6），而「按记录值动态取 i18n 文案」**尚未被证实可行**（Dev 报告动态 `$t()` 渲染字面量，但该测量**尚未归档** → backlog「D5 续」）。
  2. **BUG-006（P2）**：`?page=hub` 同屏 **4 个** `primary`（行内 Approve），违反 UI 标准 §4.3/§4.4/§9 第 3 条（第 435 行「至多一个主操作」）。REQ-002 F2 已对 `posts`/`pages` 用同一口径收口，hub 是同一形态遗留。
  3. **BUG-009（P2）**：`?page=dashboard` 节点身份卡**整卡空白**——`dashboard.aup` 全文无 `propBind`，却直接读 `${state.nodeProfile.*}` / `${state.nodeHealth.*}`，另有 `visible="!${state.nodeProfile}"` 的空态卡（该取反在平台恒不成立）。属 **pre-existing**（`git show HEAD:.aup/pages/admin/dashboard.aup` 同样无 `propBind`），是 REQ-002 A11 在该页无观察对象的原因。
- 同类低优先级遗留（QA 报告 §7-6）：`compose-edit` 的 gate 卡 `padding` 16px vs `compose` 20px（两者在 `HEAD` 即如此）；D4 只裁定「gate 卡豁免 14px」，未规定具体值 → 随本批顺手统一。
- 以上都是**已 ✅ 页面的质量缺口**，不是新功能；清单状态列不变。

## 2. 范围

### 2.1 做

| 组 | 条目 | 内容 |
| -- | ---- | ---- |
| 状态呈现 P2 | **BUG-005** | 让行内状态**诚实且可区分**：① 若平台可按记录值切换文案（须先探针实测），四态文案互异；② 否则降级为「中性措辞 + 原始状态以**可见文本**呈现」，并在页面如实标注降级。禁止「把不同状态说成同一件事」（现状 `deleted`→「In drafts」）。同批收口 QA §7-3 的 `hub` `relation`/`direction`/`freshness` 与 `access` 行状态缺失 |
| 主操作唯一 P2 | **BUG-006** | `.aup/pages/ops/hub.aup` 行内 `Approve` 由 `primary` 降为 `secondary`；降级后同屏 `primary ≤ 1`（为 0 亦合规），并在上报写明页头是否保留主操作 |
| 节点身份卡 P2 | **BUG-009** | `dashboard.aup` 补 `propBind={nodeProfile: "/instance/app/arcblog/node/profile.json", nodeHealth: "/instance/app/arcblog/node/health.json"}`（或如实移除该卡，二选一须在上报写明）；顺手删掉恒不成立的 `visible="!${state.nodeProfile}"` 空态写法（`arc-contracts.md` §28.1） |
| 密度 P3（顺手） | QA §7-6 | 统一 `compose` / `compose-edit` 的 **gate 卡** `padding`（两者取同一值；D4 的「gate 卡豁免 14px」不变），并在上报写明取值 |

### 2.2 明确不做

1. **不做 F8②「一键复制」**（控制台无剪贴板原语，`arc-contracts.md` §25.1；`frame` + 自定义组件的尺寸/性能代价未实测）——仍在 backlog 候选。
2. **不新增页面 / 功能 / 数据 / AFS 记录**；不改信息架构（D2 的 spec §15.1/§15.2 hash 版菜单树待用户裁定）。
3. **不改标准口径**：若 BUG-005 只能走「改 UI 标准 §4.1/§9」的路径 C，**停手上报 Lead/用户**，不得在本 REQ 内自行降标准（D6 裁定前不得动工）。
4. **不改 `docs/ArcBlog-admin-ui-design.md`**（BUG-007/008 的残余漂移由 UI 批次处理，写范围不重叠）；不改 `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md` 状态列、`docs/arc-contracts.md`（Lead 写范围）。
5. **不动**链上 / 链适配器 / `node.key` / `.env.local` / `world/**` / `blocklet.yaml` / `replicated` 权限表。
6. **不为「更好看」重写既有页面**；不引入未实测的平台机制（spec §150）；**不跑** `arc dsl lint --fix`（会误删运行时寻址 id）。
7. **不做像素级视觉走查**（由 UI 的排队 #7 处理）。

## 3. 验收标准

> 控制台断言在 **admin 会话**下访 `http://arcblog.localhost:4939/?page=<name>`；测量表达式若与 UI-001 §5 / QA 报告 §3 重复，以本表为准。改了 `.aup/**` 必须 `arc dsl generate --write`（如需要）+ `arc blocklet build`；**每步过快层门**。

**A1 通用门（必过）**
```bash
arc dsl validate --json                          # "issues": []
npm test                                         # 28/28 pass, exit 0（快层，含漂移门/死键门/侧栏 --check/runtime-id/主题/guest 权限）
node scripts/arcblog-console-nav.mjs --check     # exit 0，{"action":"check","pages":17}
arc blocklet build                               # 改了 .aup/** 必跑；随后逐文件 diff -q 源/ dist/
arc dsl generate --check                          # 无漂移（dry-run 输出 nothing to change）
```

**A2 BUG-005 —— 状态呈现「诚实且可区分」**
探针（写入 4 条 intent 观察队列行，观察后**逐条删除**；脚本与命令见 [`bugs/BUG-005-…md`](../bugs/BUG-005-f5-status-single-encoding-constant-label.md)「复现命令」）：
```bash
# pending / done / noop / failed 四条探针 intent → tags/intents/<id>.json，观察 ?page=tags 后 clean
```
- **A2.1 诚实性（两条路径都必须满足，否则不通过）**：不得出现「不同的真实状态被同一句话断言成同一件事」。逐条核对四类行：`?page=posts` 草稿区（同时含 `draft` 与 `deleted` 时）、`?page=tags` 队列四态、`?page=dashboard` 订单卡、`?page=hub` 关系/索引行。
- **A2.2 路径 A（首选，必须先实测再采用）**：4 条 tags 探针行的**可见状态文本两两不同**（4 个互异字符串），且 `dashboard` 的订单行文案随 `status` 变化。证据 = 该机制的**实测记录 + 浏览器原始输出**（每行的可见文本），并说明用的是哪个平台原语（不得臆造 ARC API）。若采用路径 A，需把该写法连同证据补进 `arc-contracts.md`（由 Lead 落笔）。
- **A2.3 路径 B（降级，必须附「A 不可行」的实测证据 + D5 续事实已由 Lead 归档）**：
  ① 文案改为对该行真实状态**不作断言**的中性措辞；② 每行原始状态**以可见文本呈现**（不得只藏在 `title`）；③ 列表后有常驻 dim 说明如实标注降级与平台限制；④ `access` 行至少给出状态或明确说明「该页无状态」。
- **A2.4 hub 同源项（QA §7-3）**：`?page=hub` 的 `relation`/`direction`/`freshness.state` 与 A2.2/A2.3 同口径收口。走路径 B 时**原始英文值可见是可接受的**，但必须有本地化标签前缀（如 `Freshness: offline`），不得继续「常量类别词 + 真实值只在 `title`」。
- **A2.5 i18n 门**：新增/保留键全部声明在所属页 `i18n {}`；`npm test` 死键门绿；不得留下永不渲染的死键。

**A3 BUG-006 —— `?page=hub` 同屏 `primary ≤ 1`**
```bash
grep -n 'variant=primary' .aup/pages/ops/hub.aup     # 静态复核：结果必须与浏览器计数一致
```
浏览器（admin，`?page=hub`）：
```js
[...document.querySelectorAll('button,a')]
  .filter(el => el.getBoundingClientRect().width > 0 && el.getAttribute('data-variant') === 'primary').length
// 期望 ≤ 1（现状 4）
```
期望：`≤ 1`（降为 `0` 亦合规——§4.4「至多一个」含 0）；若为 0，上报写明页头是否保留主操作及理由。对照页 `?page=posts` / `?page=pages` / `?page=compose` / `?page=tags` 的 `primary` 数量**不回退**（各 1）。

**A4 BUG-009 —— `?page=dashboard` 节点身份卡**
```bash
arc afs exec /blocklets/arcblog/.actions/read --json --args '{"path":"/instance/app/arcblog/node/profile.json"}'   # 实例侧确有数据
grep -n propBind .aup/pages/admin/dashboard.aup      # 路径① ≥1；路径②（移除卡片）为空且页面无空标签残留
node scripts/arcblog-node.mjs check                  # 与卡内 name / version / roles 对照
```
浏览器（admin，`?page=dashboard`）：
- **路径①（推荐）**：卡内出现 ≥1 个 `did:key:` 元素，**中间截断**（保留头尾）+ `title` 为完整值；`name` 与 `version` 至少两项有值且与 `arcblog-node.mjs check` 输出一致；恒不成立的 `visible="!${state.nodeProfile}"` 写法不再用于该卡。
- **路径②（如实移除）**：页面不再渲染只有标签没有值的卡片（`v` / `●` / `Roles` / `Capabilities` 等裸标签不残留），且节点身份信息仍可在控制台看到——`?page=operations` 必须仍显示 profile/DID（现实现已可见）。
- 两条路径都必须在回报里写明选了哪条 + 浏览器节点的 `text` / `title` 原始输出。

**A5 顺手项（QA §7-6）**：`?page=compose` 与 `?page=compose-edit` 的 **gate 卡**（未登录登录门）computed `padding` **取值一致**，并在回报写明统一到哪个值（内容卡仍为 `14px` / `rowGap 10px`，D4 不变）。

**A6 回归与受限/禁止项**
```bash
npm test                                                     # 28/28
npm run test:file -- scripts/arcblog-console-nav.test.mjs     # 7/7
npm run test:file -- scripts/arcblog-runtime-ids.test.mjs     # 3/3
grep -rnE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/ | grep -v '\.json' || echo "no hardcoded color"
```
- 期望：全绿、无硬编码颜色、同屏 `primary`/`h2` 结构断言不回退、`dist/` 与源一致。
- **不做全量 `npm run test:live`**（用户 2026-09-27 新门规）；若触及 AFS 记录 / CLI，按受影响文件**定向单跑**并在 `.gate-lock` 下串行。
- **受限项（如实标注，不得推断为通过）**：像素级视觉一致性（由 UI 走查）；admin 身份独立性（沿用共享调试 Chrome 时必须写明来源）；`searchable-dropdown` 首选路径的独立复现（QA 写范围外）。
- **禁止项**：见 §2.2（改标准口径、spec、checklist 状态列、`arc-contracts.md`、`world/**`、`blocklet.yaml` 一律不做；越界即停并上报）。

## 4. 依赖

- **先决 D6（阻塞）**：BUG-005 的呈现口径三选一（A 静态分支可用性实测 / B 中性措辞 + 原始状态可见的降级 / C 修订 UI 标准 §4.1·§9 与 REQ-002 A10）由 **Lead（必要时用户）拍板**。**D6 未裁定前不得开工 BUG-005**（见 [`backlog.md`](../backlog.md)「需要决策才能动的」D6）。
- **先决 D5 续（阻塞路径 B）**：Dev 的「动态 `$t(<key>)` 运行期渲染字面量」实测事实必须由 **Lead 归档**进 `docs/arc-contracts.md`（并同步 `.agents/skills/aup-dsl`）；否则路径 B 的降级没有权威依据。
- **上游**：Round 7 裁决（backlog 🐞 区，PM `task-5`）→ 本 REQ → R8 Dev 任务 → R8 QA 任务必须 `blocked_by` Dev 任务（验证对象在脚下移动的旧教训）。
- **串行约束**：本 REQ 与排队 #8–#14 的功能界面项**同写范围**（`.aup/pages/**`）→ 必须串行或明确不同文件；与 UI 的 BUG-007/008（`docs/ArcBlog-admin-ui-design.md`）**不重叠，可并行**；与排队 #5（QA 写入类断言回归）串行（QA 必须等本项完成）。
- **外部条件**：可写 dev 实例（`?page=dashboard` 需实例上有 `node/profile.json` 数据，本机已有）；浏览器验证需 `arc dsl generate --write`（如新增键）+ `arc blocklet build` + daemon 重启。
- **状态说明**：本 REQ 为**草案**，PM 本轮**未创建任务板任务**（Lead 指示 PM 本轮只裁决）→ 不满足 backlog 进入 🟥 的硬条件；Lead 决定 R8 开工时，先补任务（带 `write_scopes` / `blocked_by`），再由 PM/Lead 唤醒 Dev。

## 5. 涉及写范围

| 路径前缀 | 用途 | 归属 |
| -------- | ---- | ---- |
| `.aup/pages/admin/dashboard.aup` | BUG-009（`propBind` / 空态写法） | Dev |
| `.aup/pages/admin/posts.aup` | BUG-005（草稿区状态呈现） | Dev |
| `.aup/pages/site/tags.aup` | BUG-005（队列四态呈现） | Dev |
| `.aup/pages/ops/hub.aup` | BUG-005（§7-3 freshness/relation）+ BUG-006（primary 降级） | Dev |
| `.aup/pages/ops/factory.aup`、`.aup/pages/economy/access.aup` | BUG-005 同形 | Dev |
| `.aup/pages/admin/compose.aup`、`.aup/pages/admin/compose-edit.aup` | §7-6 gate 卡 padding 统一 | Dev |
| `.aup/locales/*.json` | 由 `arc dsl generate --write` 生成（不手改） | Dev（生成） |
| `dist/**` | `arc blocklet build` 生成（不手改） | Dev（生成） |
| `docs/team/test-reports/**`、`docs/team/bugs/**` | R8 复验报告与 BUG 状态更新 | QA |
| `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 看板 / 本 REQ / 轮次日志 | PM |
| `docs/ArcBlog-admin-ui-design.md`、`docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/arc-contracts.md`、`CLAUDE.md`、`.agents/skills/**` | **本 REQ 一律不改**（文档漂移走 UI 批次；平台事实归档与标准口径由 Lead） | Lead / UI |

**边界**：本 REQ 不授权改标准口径、不改实现以外的文档、不改清单状态列；D6 / D5 续由 Lead 裁定，越界即停并上报。
