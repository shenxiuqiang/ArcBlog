# REQ-004 — 控制台 Round 7 遗留缺陷收口（BUG-005 / BUG-006 / BUG-009）

**元信息**：REQ-004 ｜ 对应 spec 章节：**§15.1 后台信息架构 / §15.2 控制台外壳 / §107–§109 节点身份**（页面级依据 [`docs/ArcBlog-admin-ui-design.md`](../ArcBlog-admin-ui-design.md) §4.1 状态指示 / §4.3 按钮层级 / §4.4 空状态 / §5.1 标识 / §5.4 / §9 验收清单）｜ checklist 行：D 组「概览 Dashboard」「Hub 管理」「分类与标签管理界面」——**本项不改状态列**（缺陷是质量缺口，不是功能缺失）｜ 优先级：**P2**｜ 提出轮次：**Round 7（PM 裁决轮）**｜ 负责角色：**Dev**｜ 状态：**已交付并验收放行（Round 8：`task-7` → QA `task-9`）** —— QA 报告 [`test-reports/round-8.md`](../test-reports/round-8.md) §2.1 判**放行**（`VERDICT=pass` / `BLOCKING=0`）：A1 / A2.1–A2.5 / A3 / A5 / A6 **通过**，**A4 实现通过**（字面判据 `did:key:` 按 Lead 等价口径放行，修订标注见 §3.1，**原措辞不改写**）；D6 执行结果 = **路径 A 不可行 → 采用路径 B**（证据 round-8.md §3-C/§4 用例 4）。本轮结果记录见 **§3.1**

---

## 1. 背景

- Round 7 的两项交付（REQ-002 控制台一致性收口、REQ-003 界面标准事实对齐）经 QA 独立验收**放行**（[`test-reports/round-7.md`](../test-reports/round-7.md)，`VERDICT=pass` / `BLOCKING=0`），但 QA 新增了 5 条 BUG：**P2×3 + P3×2**（无 P0/P1）。本轮按 Lead 指示**不触发修复/复验流程**，PM 已把 5 条全部裁决为「下一轮修」（见 [`backlog.md`](../backlog.md) 🐞 区）。
- 本 REQ 承接其中 **Dev 侧的 3 条 P2**（P3×2 的文档漂移由 UI 走 REQ-003 续作，写范围不重叠）：
  1. **BUG-005（P2）**：REQ-002 F5 的「色点 + 本地化状态文字」双编码退化成**常量类别词**——`?page=posts` 草稿区 26 条 `deleted` + 1 条 `draft` 全部显示「In drafts」；`?page=tags` 的 `pending`/`done`/`noop`/`failed` 四态同一句「Queued intent」；`?page=dashboard` 的 `paid`→「Order」；`?page=hub` 三态同词且 `freshness` 仍以裸英文 `offline` 出现；`?page=access` 行连状态词都没有。真实值只剩色点 `title`（hover 才可见）→ 违反 UI 标准 §4.1（第 284 行「状态点与文字必须同时出现」）与 §9 第 6 条「双编码：状态不只依赖颜色」（第 438 行）。**已知限制**：`visible` 只支持同步 `$session.*`（`arc-contracts.md` §28.1）、`afs-list.emptyText` 四种写法全无效（§28.6），而「按记录值动态取 i18n 文案」**尚未被证实可行**（Dev 报告动态 `$t()` 渲染字面量，该测量已由 Lead 归档为 [`docs/arc-contracts.md`](../../arc-contracts.md) **§28.8**；R8 必须重跑探针复核，见 §3 A2.2）。
  2. **BUG-006（P2）**：`?page=hub` 同屏 **4 个** `primary`（行内 Approve），违反 UI 标准 §4.3/§4.4/§9 第 3 条（第 435 行「至多一个主操作」）。REQ-002 F2 已对 `posts`/`pages` 用同一口径收口，hub 是同一形态遗留。
  3. **BUG-009（P2）**：`?page=dashboard` 节点身份卡**整卡空白**——`dashboard.aup` 全文无 `propBind`，却直接读 `${state.nodeProfile.*}` / `${state.nodeHealth.*}`，另有 `visible="!${state.nodeProfile}"` 的空态卡（该取反在平台恒不成立）。属 **pre-existing**（`git show HEAD:.aup/pages/admin/dashboard.aup` 同样无 `propBind`），是 REQ-002 A11 在该页无观察对象的原因。
- 同类低优先级遗留（QA 报告 §7-6）：`compose-edit` 的 gate 卡 `padding` 16px vs `compose` 20px（两者在 `HEAD` 即如此）；D4 只裁定「gate 卡豁免 14px」，未规定具体值 → 随本批顺手统一。
- 以上都是**已 ✅ 页面的质量缺口**，不是新功能；清单状态列不变。

## 2. 范围

### 2.1 做

| 组 | 条目 | 内容 |
| -- | ---- | ---- |
| 状态呈现 P2 | **BUG-005** | 让行内状态**诚实且可区分**：① 若平台可按记录值切换文案（须先探针实测，给出原始输出），四态文案互异；② 否则降级为「本地化中性标签 + 原始状态以**可见文本**呈现 + 色点」，并在页面/标准如实标注降级。禁止「把不同状态说成同一件事」（现状 `deleted`→「In drafts」）。同批收口 QA §7-3 的 `hub` `relation`/`direction`/`freshness` 与 `access` 行状态缺失。**D6 已裁定（Lead，2026-09-27）：先探针后降级（A→B）+ 口径改写**——见 §4 与 §3 A2 |
| 主操作唯一 P2 | **BUG-006** | `.aup/pages/ops/hub.aup` 行内 `Approve` 由 `primary` 降为 `secondary`；降级后同屏 `primary ≤ 1`（为 0 亦合规），并在上报写明页头是否保留主操作 |
| 节点身份卡 P2 | **BUG-009** | `dashboard.aup` 补 `propBind={nodeProfile: "/instance/app/arcblog/node/profile.json", nodeHealth: "/instance/app/arcblog/node/health.json"}`（或如实移除该卡，二选一须在上报写明）；顺手删掉恒不成立的 `visible="!${state.nodeProfile}"` 空态写法（`arc-contracts.md` §28.1） |
| 密度 P3（顺手） | QA §7-6 | 统一 `compose` / `compose-edit` 的 **gate 卡** `padding`（两者取同一值；D4 的「gate 卡豁免 14px」不变），并在上报写明取值 |

### 2.2 明确不做

1. **不做 F8②「一键复制」**（控制台无剪贴板原语，`arc-contracts.md` §25.1；`frame` + 自定义组件的尺寸/性能代价未实测）——仍在 backlog 候选。
2. **不新增页面 / 功能 / 数据 / AFS 记录**；不改信息架构（D2 的 spec §15.1/§15.2 hash 版菜单树待用户裁定）。
3. **不改标准口径**：**D6 已裁定**——原路径 C 中「色点 + `title` 单编码可接受」的部分**未采纳**，本 REQ **不得**下调 UI 标准 §4.1 / §9 第 6 条（双编码要求不变）；口径改写只按 D6 第 3 条执行（「不得出现『不同真实状态被同一句话断言』；原始枚举值可以可见，但必须有本地化上下文」），该改写已由 PM 写入 **§3 A2.1/A2.3/A2.4**，并同批写入 REQ-005 §3 A5（`docs/ArcBlog-admin-ui-design.md` §4.1 的降级说明，由 UI 落 `task-8`）。若 Dev 认为仍需改标准口径，**停手上报 Lead**。
4. **不改 `docs/ArcBlog-admin-ui-design.md`**（BUG-007/008 的残余漂移由 UI 批次处理，写范围不重叠）；不改 `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md` 状态列、`docs/arc-contracts.md`（Lead 写范围）。
5. **不动**链上 / 链适配器 / `node.key` / `.env.local` / `world/**` / `blocklet.yaml` / `replicated` 权限表。
6. **不为「更好看」重写既有页面**；不引入未实测的平台机制（spec §150）；**不跑** `arc dsl lint --fix`（会误删运行时寻址 id）。
7. **不做像素级视觉走查**（由 UI 的排队 #2 处理）。

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

**A2 BUG-005 —— 状态呈现「诚实且可区分」（口径按 D6 第 3 条改写）**
探针（写入 4 条 intent 观察队列行，观察后**逐条删除**；脚本与命令见 [`bugs/BUG-005-…md`](../bugs/BUG-005-f5-status-single-encoding-constant-label.md)「复现命令」）：
```bash
# pending / done / noop / failed 四条探针 intent → tags/intents/<id>.json，观察 ?page=tags 后 clean
```
> **口径（D6 第 3 条，Lead 2026-09-27 裁定）**：原「**不得出现裸英文枚举**」修订为「**不得出现『不同真实状态被同一句话断言』；原始枚举值可以可见，但必须有本地化上下文**」。即：`deleted` / `offline` 这类原始值**允许**直接出现在可见文本里，前提是同一行有本地化的标签/类别词作上下文（如 `In drafts · deleted`、`Freshness: offline`）；被禁止的是「`deleted` 与 `draft` 都显示成同一句『In drafts』」这种**不诚实**渲染。§4.1 的「状态点与文字必须同时出现（双编码）」**要求不变**——**不得**只把真实值放进 `title`。

- **A2.1 诚实性（两条路径都必须满足，否则不通过）**：逐条核对四类行，**不同的真实状态不得被同一句话断言成同一件事**：`?page=posts` 草稿区（同时含 `draft` 与 `deleted` 时）、`?page=tags` 队列四态、`?page=dashboard` 订单卡、`?page=hub` 关系/索引行。复核时按上面的**修订口径**判定（原始枚举值可见**不**算违规；缺少本地化上下文、或不同状态同句才算违规）。
- **A2.2 路径 A（首选，必须先实测再采用；不可用才可降级）**：按 D6 第 1 条，**先做探针实测并给出原始输出**，可选机制 = (a) 模板化/动态 `$t()` 文案（R7 Dev 报「渲染字面量」→ **R8 必须重跑探针**）；(b) `arc dsl schema` / 能力清单里任何「记录值 → 本地化 label」映射原语；(c) `afs-list` 行内条件渲染。**任一可用 → 用它**，使 4 条 tags 探针行的**可见状态文本两两不同**（4 个互异字符串），且 `dashboard` 订单行文案随 `status` 变化。证据 = 该机制的**实测记录**（命令 + 原始输出）+ 浏览器每行的可见文本，并说明用的是哪个平台原语（不得臆造 ARC API）。**若探针结果与 [`docs/arc-contracts.md`](../../arc-contracts.md) §28.8 有出入，必须在回报里明确指出——新证据优先，Lead 会回来修订该节**。采用路径 A 时，需把该写法连同证据补进 `arc-contracts.md`（由 Lead 落笔）。
- **A2.3 路径 B（**仅当** A 的探针证明三种机制都不可行时采用；必须附「A 不可行」的实测证据，不得只是断言）**：
  ① 文案改为对该行真实状态**不作断言**的本地化**中性标签**（如「状态」/类别词）；
  ② 每行原始状态**以可见文本呈现**（如 `deleted`、`offline`，可与 ① 同行拼接）——**不得只藏在 `title`**；
  ③ 列表后有常驻 **dim** 说明，如实标注降级与平台限制（引用 `arc-contracts.md` §28.8 / §28.1 / §28.6）；
  ④ **不得**把不同真实状态渲染成同一句话；
  ⑤ `access` 行至少给出状态或明确说明「该页无状态」。
- **A2.4 hub 同源项（QA §7-3）**：`?page=hub` 的 `relation`/`direction`/`freshness.state` 与 A2.2/A2.3 同口径收口。走路径 B 时**原始英文值可见是可接受的**，但必须有**本地化标签前缀**（如 `Freshness: offline`），不得继续「常量类别词 + 真实值只在 `title`」。
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

> **R8 结果（不重写上面的判据，只标注修订）**：Dev 选**路径①（补 `propBind`）**；卡内实测 `ArcBlog / did:bloc…rcblog / v0.3.7 / ● ok / Roles basic / Capabilities blog.read,blog.write,blog.publish`，与 `arc afs exec read` + `arcblog-node.mjs check` 一致。**唯一不满足的是上面「≥1 个 `did:key:` 元素」这条字面判据**——本实例节点 DID 是 `did:blocklet:arcblog`（blocklet 身份，不是 key 身份）。**Lead 已裁定等价放行**，等价口径为「真实 DID 中间截断 + `title` 承载完整值 + name/version 与 `arcblog-node.mjs check` 一致」；详见 **§3.1**（验收记录）与 [`backlog.md`](../backlog.md) 🐞 区 7-2。

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

### 3.1 Round 8 结果记录（PM，2026-09-27 轮末）

- **交付（Dev，`task-7`）**：`.aup/pages/admin/{dashboard,posts,compose-edit}.aup`、`.aup/pages/site/tags.aup`、`.aup/pages/ops/{hub,factory}.aup`、`.aup/pages/economy/access.aup`（7 个页面）+ `.aup/locales/{en,zh}.json` + `.aup/app.json` / `.aup/wrapper.json`（`arc dsl generate` 生成）+ `dist/**`（`arc blocklet build`）＝ QA §0 快照里的 **11 个源文件**。**`admin/compose.aup` 未改**（其缺内容列滚动容器是 pre-existing → 范围外 BUG-010，见本节末）。
- **验收（QA，`task-9`）**：报告 [`test-reports/round-8.md`](../test-reports/round-8.md) §2.1 / §3 / §8，**放行**（`VERDICT=pass` / `BLOCKING=0`）。证据按三类分开：
  - **浏览器实测**：**A2.1**（posts 草稿区 `draft`/`deleted` 互异、tags 队列 `done`/`failed`/`noop`/`pending` 四态互异、dashboard `paid`/`refunded`、hub `Relation/Direction/Status/Freshness` 同口径；`/tmp/qa-assert-distinct.js` 四页 `verdict:"PASS"`、`collisions:[]`）/ **A2.4** / **A3**（`?page=hub` `primary`=**0**；posts/pages/compose/tags/factory 各 =1，不回退）/ **A5**（guest incognito 实测 compose 与 compose-edit 的 gate 卡 computed `padding: 20px` 一致；内容卡仍 `14px` / `rowGap 10px`）/ **A4 卡片 DOM**（`text` / `title` 原始输出）。
  - **静态复核**：**A1**（validate `"issues": []`；`npm test` **28/28 ×2**；`console-nav --check` → `pages:17`；`generate --check` 无漂移；11 文件源↔`dist` `diff -q` 全 same）/ **A2.2**（路径 A 三机制复核）/ **A2.3**（路径 B 五条：中性标签 + 原始值可见 + 5 页常驻 dim `status-note` + 不同状态不同句 + access 无状态说明）/ **A2.5**（死键门 + en/zh 键集门）/ **A6**（28/28、console-nav 7/7、runtime-ids 3/3、`no hardcoded color`）。
  - **受限未验证**：**A2.2 中「源码形式动态 `$t()`（`$t(posts.status-${entry.content.status})`）的运行期原始输出」**——探针要新建/改 `.aup`，超出 QA 写范围，Dev 的 R8 探针页已删除；QA 用**独立数据面探针**（记录字段携带 `$t()` token → 原样渲染字面量）+ bundle/schema 静态证据替代。**PM 裁决：不修（不单独立项）**，理由见 [`backlog.md`](../backlog.md) 🐞 区 7-1。
- **A4 裁定（按 Lead 裁定记录，标注修订、不改写历史结论）**：原判据「卡内 ≥1 个 `did:key:` 元素 + 中间截断 + `title` 全值」在本实例**不可满足**——节点 DID 是 `did:blocklet:arcblog`（blocklet 身份）。**等价放行口径**＝「**真实 DID 中间截断 + `title` 承载完整值 + name/version 与 `arcblog-node.mjs check` 一致**」；QA 实测卡内 `ArcBlog / did:bloc…rcblog / v0.3.7 / ● ok / Roles basic / Capabilities blog.read,blog.write,blog.publish`，与 `arc afs exec read`（`did=did:blocklet:arcblog`）及 `arcblog-node.mjs check` 一致；`visible="!${state.nodeProfile}"` 0 命中。**实现路径①（补 `propBind={nodeProfile,nodeHealth}`，`dashboard.aup:122`）**，未选路径②。spec §107–§109 + UI 标准 §5.1/§5.4。
- **D6 执行结果（路径 A → B）**：**路径 A 不可行**，三机制全不可用（round-8.md §3-C：运行时 bundle 内 `i18n` / locale 键 / `$entry` 命中 0，客户端 `visible` 求值器只支持 `||`/`&&`/`!`/`$session.*`/`$state.*`、无等值比较；`arc dsl schema --json` 63 原语里无「记录值 → 本地化 label」映射；独立数据面探针把 `$t(wrapper.nav-console)` 原样渲染）→ **采用路径 B**：本地化中性标签（`Status`/`状态`）+ 原始状态值**以可见文本呈现** + 色点 + 列表后**常驻 dim** 说明（引用 `arc-contracts.md` §28.8）。**BUG-005 复验通过**；**未发现与 §28.8 出入，该节无需修订**。
- **同批收口**：BUG-006（`?page=hub` `primary` 4→0）、BUG-009（身份卡有值，见上）、QA §7-6（gate 卡 padding 统一为 **20px**，compose 与 compose-edit 一致）。
- **范围外新增（本轮不改，已裁决）**：**BUG-010（P2）**——`compose` / `appearance` 内容列缺 `size={flex: 1} style={overflowY: auto}` 滚动容器（15/17 页有），`?page=compose` 滚动时整壳滚走；**pre-existing**（`.aup/pages/admin/compose.aup` 本轮 `git diff` 为空）。**PM 裁决「下轮修（R9）」**，落点 `.aup/pages/admin/{compose,appearance}.aup`（与本 REQ 的页面同属 `.aup/pages/**` → R9 必须同一 Dev 批次串行）；见 [`backlog.md`](../backlog.md) 🐞 区与 [`bugs/BUG-010-…md`](../bugs/BUG-010-compose-appearance-missing-content-scroll-container.md)。
- **写范围核对**：QA 复核 `git status --short`，Dev 名下改动只有上列 `.aup/**`（+ `dist/**` build 镜像），**未触碰** `docs/**`、`scripts/**`、`world/**`、`blocklet.yaml`、spec、checklist 状态列。

## 4. 依赖

- **先决 D6（已裁定 · 阻塞解除）**：BUG-005 的呈现口径由 **Lead 于 2026-09-27 裁定为「先探针、不可行再降级」（A→B）**，摘要：
  1. **路径 A 必须先做探针实测**（本项执行）：可选机制 = (a) 模板化/动态 `$t()` 文案（R7 Dev 报「渲染字面量」→ R8 **必须重跑探针并给出原始输出**）；(b) `arc dsl schema` / 能力清单里任何「记录值 → 本地化 label」映射原语；(c) `afs-list` 行内条件渲染。**任一可用 → 用它**，让不同真实状态显示不同本地化文案。
  2. **A 不可行（必须附实测证据，不得只是断言）→ 路径 B**：每行 = 本地化中性标签 + 原始状态值**以可见文本呈现** + 色点；**不得**只把真实值放进 `title`；**不得**把不同真实状态说成同一句话；列表后给常驻 dim 说明。
  3. **口径改写**：REQ-002 A10 的「不得出现裸英文枚举」→「**不得出现『不同真实状态被同一句话断言』；原始枚举值可以可见，但必须有本地化上下文**」——已写进本 REQ §3 A2.1/A2.3/A2.4 与 REQ-005 §3 A5；`docs/ArcBlog-admin-ui-design.md` §4.1 的「平台受限 + 降级说明」由 UI 同批落（`task-8`）。
  4. **未采纳**：原路径 C 的「色点 + `title` 单编码可接受」（与 2 的「不得只放进 `title`」冲突）。
  全文见 [`backlog.md`](../backlog.md)「需要决策才能动的」**D6** 行（标记 **已裁定（Lead, 2026-09-27）**）。
- **先决 D5 续（已归档 · 阻塞解除）**：Dev 的「动态 `$t(<key>)` 运行期渲染字面量 / bundle 内无客户端 `$t(` 解析器」已由 **Lead 归档**为 [`docs/arc-contracts.md`](../../arc-contracts.md) **§28.8**《动态 i18n key 不生效：`$t()` 的 key 必须是**编译期常量**》，并含 D6 的降级路径 B 原文。**证据边界**（§28.8 原文）：来自 R7 Dev 探针 + R7 QA 的 bundle 复检，**QA 未能独立证伪**；本项（`task-7`）**必须在页面上重跑该探针并把原始输出附在回报里，若与 §28.8 有出入必须指出**（新证据优先，Lead 回来修订该节）。§28.8 的完整引用见本文件 §1 第 1 条与 `backlog.md`「需要决策才能动的」D5 续 行（标记 **已归档**）。
- **上游**：Round 7 裁决（backlog 🐞 区，PM `task-5`）→ 本 REQ → R8 Dev 任务（**`task-7`**）→ R8 QA 任务（**`task-9`**，必须 `blocked_by task-7 + task-8`；验证对象在脚下移动的旧教训）。
- **串行约束**：本 REQ 与排队 #3–#9 的功能界面项**同写范围**（`.aup/pages/**`）→ 必须串行或明确不同文件（排队 #7/#8 与本项直接同名文件：`ops/hub.aup`、`ops/factory.aup`）；与 UI 的 REQ-005（`docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`）**不重叠，可并行**（唯一单向信息依赖：若路径 A 可用，§4.1 的说明需按实际路径重写，由 Lead 修订 §28.8 后 PM 追加指令）；与排队 #1（QA 写入类断言回归）串行（QA 必须等本项完成）。
- **外部条件**：可写 dev 实例（`?page=dashboard` 需实例上有 `node/profile.json` 数据，本机已有）；浏览器验证需 `arc dsl generate --write`（如新增键）+ `arc blocklet build` + daemon 重启。**门规（用户 2026-09-27 裁定）**：不跑全量 `npm run test:live`；本项改的是页面标记/文案，**不写实例**，预期无需 `.gate-lock`；若采用 `arc afs exec` 写探针记录（如 BUG-005 的 4 条 intent），先写 `docs/team/.gate-lock`（owner + 时间），跑完删除。
- **状态说明（2026-09-27 更新）**：本 REQ 已 **派发**——任务板 **`task-7`**（owner Dev，`write_scopes` = `.aup/pages/**` + `.aup/locales/**` + `dist/**`），复验 **`task-9`**（QA-003，`blocked_by task-7 + task-8`）；两项先决（D6 裁定 / D5 续归档）均已解除，故 backlog 已入「Round 8 / 🟥 本轮」。（历史：Round 7 轮末 PM 只裁决、未派活，本文件当时为草案。）

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
