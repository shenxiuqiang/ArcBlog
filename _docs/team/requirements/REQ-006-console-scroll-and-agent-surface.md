# REQ-006 — 控制台滚动容器收口（BUG-010）+ Agent 能力与工具页升级（§15.8）

**元信息**：REQ-006 ｜ 对应 spec 章节：**§15.2 控制台外壳 / §15.8 Agent 能力与工具 / §59–§62 Agent Access / §129–§130 平台面与默认关闭**（页面级依据 [`docs/ArcBlog-admin-ui-design.md`](../ArcBlog-admin-ui-design.md) §2.5 全高流式布局与滚动归属 / §8 第 422 行滚动容器公式 / §9 第 2 条）｜ checklist 行：D 组「**Agent 能力与工具页**」（第 116 行，🟡 → **✅ 候选**，由 Lead 轮末落笔）+ 第 98 行「控制台外壳」（BUG-010 是其一致性缺口；本项不改状态列）｜ 优先级：**P2（BUG-010）＋ 功能界面补全（排队 #3 第 1 项）** ｜ 提出轮次：**Round 9** ｜ 负责角色：**Dev** ｜ 状态：**已交付并验收（`task-12`，Round 9）** —— A1 / A3 / A4 **通过**，**A2 实现通过**（BUG-010 收口：6/6 组无可滚动容器包含 `.aup-app-header`、注入式滚动归属 6/6）；A2 的两条字面期望不可满足 → **BUG-015（P3，判据措辞，非实现缺陷）**，判据修订见 **§3.1**（原措辞保留不改写）。Round 9 整体**未放行**（QA `VERDICT=fail`，阻断项为范围外 P1 **BUG-012**，与本 REQ 交付无关）

---

## 1. 背景

### 1.1 BUG-010（P2，Round 8 QA 新增 → PM 裁决「本轮修（R9）」）

- 缺陷文件：[`bugs/BUG-010-compose-appearance-missing-content-scroll-container.md`](../bugs/BUG-010-compose-appearance-missing-content-scroll-container.md)。
- **QA 实测事实**（admin 会话，原始 JSON 见 BUG-010「实际」）：`?page=compose` 在 1803×908 下**只有一个**可滚动容器，且它**同时包含** `.aup-app-header` 与侧栏当前项 `[data-active="true"]` → 滚它 = **整壳（顶栏 + 侧栏）一起滚走**（`navMoved:true`、`header.top: 0 → -778`）；对照页 `?page=posts` 的同类容器的 `containersContainNav/Header` 均为 `false`、`navMoved:false`。
- **PM 只读静态基线**（2026-09-27，验收命令见 §3 A2）：
  ```text
  $ grep -rl 'size={flex: 1} style={overflowY: auto}' .aup/pages/ | wc -l
  15                                   # 共 17 个控制台页
  $ grep -rn 'overflowY: auto' .aup/pages/admin/compose.aup .aup/pages/admin/appearance.aup | wc -l
  2                                    # 两页各 1 行，且都是**侧栏**行（width: "clamp(200px, 15vw, 280px)"）
  ```
- 判据：UI 标准 §2.5「**页面固定，内容区滚动**：顶栏、console-nav 侧边栏、页头始终静止」、§8 第 422 行「内容列内 `view size={flex: 1} style={overflowY: auto}` 是**唯一**滚动容器」、§9 第 2 条「页面固定无纵向滚动条，滚动只发生在内容列内（无双滚动条）」；spec §15.2 控制台外壳。
- **pre-existing**（`HEAD` 同样缺失，非 Round 8 引入）；P2 不阻断（内容仍可达、Publish 仍可点到），但 15/17 页同形态已合规、唯这 2 页例外 → 一致性缺口。

### 1.2 清单第 116 行「Agent 能力与工具页」（§15.8，🟡）

- checklist 当前状态：**🟡**，备注 `CLI（arcblog-agent.mjs show/tools/check）✅；AUP 界面待补`。
- spec §15.8「能力与工具 Capabilities & Tools」要求（原文要点）：
  - 功能目标：「运营者必须随时清楚『AI 现在能对我的节点做什么』，**默认暴露面必须最小**」；
  - 达成标准：「一个从未配置过 Agent 的节点，其暴露面等于『**公开内容只读**』；开启任何写工具都必须经过明确的启用动作，**不存在隐式继承权限**」；
  - 功能：ARC Runtime 提供的 Agent Access 表面状态（`/mcp`、`/api/afs/rpc`、`llms.txt`）；**已声明工具清单（§130）：每个工具的说明、所需权限级别、启用开关**；默认只读、写工具默认关闭逐项开启。
- 现状（[`.aup/pages/ops/agents.aup`](../../.aup/pages/ops/agents.aup)）：只有 `config/agent-grants` 的 grants 列表 + 三条 dim 说明（默认关闭 / CLI 授权示例 / 「本页只报告状态」），**没有**工具清单、**没有**策略、**没有**分类。
- CLI 侧已 ✅：`node scripts/arcblog-agent.mjs show|check|tools|run|authorize|revoke|grants`（`scripts/arcblog-agent.mjs` 头部注释：read-only by default、default-closed、ARC Runtime 提供表面、ArcBlog 只声明与审计）。
- **PM 只读基线**（2026-09-27，命令与原始输出见 §3 A3）：
  ```text
  $ node scripts/arcblog-agent.mjs tools    → count 19；capabilities 5 项；
                                              byKind {read:9, write:4, closed:6}；defaultClosed 3 项
                                              read 中 status unavailable：list_studios / get_studio
  $ node scripts/arcblog-agent.mjs check    → ok true / failed [] / checks 8（含 policy 四段）
  $ node scripts/arcblog-agent.mjs grants   → count 0 / grants []
  ```

### 1.3 平台边界：为什么「授权入口」必须降级为 CLI 指引（spec §150：先核验再写）

**PM 只读实测证据（2026-09-27）**——页面**不能**签发/撤销 grants：

1. grants 记录由 **DID 哈希**寻址：`scripts/lib/agents.mjs:266-267` → `config/agent-grants/<didHash>.json`，其中 `didHash = sha256(did).slice(0,16)`（`scripts/lib/attribution.mjs:38-40`）。页面无法把 DID 变成记录路径。
2. AUP DSL **没有哈希/摘要原语**：
   ```text
   $ arc dsl schema --json | (jq/过滤 schema.primitives)
   primitives count 63
   /hash|digest|sha256/i 命中 0 项        # crypto-ish 只命中列表控件 key-value-list
   ```
3. TTL 必填（grant 必须有 `expiresAt`）、`agent.admin` 拒授（spec §130）、高风险能力（publish / economy）二次确认，全部在 CLI 侧（`scripts/arcblog-agent.mjs` 的 `authorize` / `revoke` / `run`）。

→ **页面只读**（策略 + 工具清单 + grants 列表）＋**可复制的 CLI 指引**；**不做**页面内签发/撤销；**不新增 AFS 集合**、**不改 `blocklet.yaml` 权限表**。

### 1.4 同批硬约束（Lead L-R9-2，2026-09-27）

- **不新增导航节**：PM 实测 `CONSOLE_SECTIONS.length === 17` 且 `CONSOLE_SECTIONS.includes('agents') === true` —— `agents` 已在菜单里，`scripts/console-nav.mjs` **不改**。
- **链上动作保持 operator-declared**，**不接链 SDK**（spec §8.5 / §130）。

---

## 2. 范围

### 2.1 做

| 组 | 条目 | 内容 |
| -- | ---- | ---- |
| 滚动容器 P2 | **BUG-010** | 在 `.aup/pages/admin/compose.aup`、`.aup/pages/admin/appearance.aup` 的**内容列内**补 `view size={flex: 1} style={overflowY: auto}`（与其余 15 页同形、同 token；其直接子项 `flexShrink: 0`——UI 标准 §2.5 第 2 条，`arc-contracts.md` §21.2），使 **17/17** 控制台页都是「外壳固定 + 内容列唯一滚动」。**不改**页面其余结构、不改 `?page=` 语义、不新增导航节。 |
| 功能界面 🟡 | **§15.8 工具清单** | `?page=agents` 增「能力与工具」区：把 `node scripts/arcblog-agent.mjs tools` 的目录（基线 **19 项**：`read` 9 / `write` 4 / `closed` 6）按 **read / write / closed 三类分区**呈现；每项含**工具名 + 所需能力（capability）+ 可用状态**；`read` 中 `status: unavailable` 的两项（`list_studios`、`get_studio`）如实标注**不可用 + 原因**（平台无跨节点 Studio 注册表，spec §71 属 POST-MVP）。 |
| 功能界面 🟡 | **§15.8 策略只读** | 增「策略（只读）」区：呈现 `node scripts/arcblog-agent.mjs check` 的 `policy` 四段 —— read-only ops、blocked write ops、`neverExposed` 前缀（drafts / orders / settlements / ledger / attributions / access grants）、`defaultClosedTools`（`settle_payment` / `change_wallet` / `change_role`，spec §130）。**页面只读，页面上没有任何开关**。 |
| 功能界面 🟡 | **§15.8 授权入口降级** | 授权区**只给 CLI 指引**（可复制文本）：`node scripts/arcblog-agent.mjs authorize --agent <did> --capability agent.write --ttl 30`、`node scripts/arcblog-agent.mjs revoke --agent <did>`；明确 **`agent.admin` 不可授予**（spec §130）；明确 spec §129 —— `/mcp`、`/api/afs/rpc`、`llms.txt` 由 **ARC Runtime 提供**，ArcBlog 只声明与审计。 |
| 功能界面 🟡 | **§15.8 grants 列表** | 保留并复核现有 grants 列表（`afs-list from "/instance/app/arcblog/config/agent-grants"`）：字段 = agent DID（中间截断 + `title` 全值）、capabilities、`expiresAt`（相对时间）；空态给出 CLI 指引与当前条数（基线 **0** 条）。 |

### 2.2 明确不做

1. **不做页面内签发 / 撤销授权**（无哈希原语 → 无法寻址记录；TTL / 拒授 / 二次确认在 CLI）——依据见 §1.3；**不为此新增 AFS 集合 / 不改 `blocklet.yaml` 权限表**。
2. **不新增导航节**（`agents` 已在 `CONSOLE_SECTIONS`；`scripts/console-nav.mjs` **不改**，`--check` 必须仍为 **17** 页）。
3. **不改 CLI 行为**：`scripts/arcblog-agent.mjs`、`scripts/lib/agents.mjs` 保持现状（页面只消费其输出）。若 Dev 判断确需改动 → **先停手上报 PM/Lead**（会触及 live 门与 `arcblog-agent.test.mjs` 定向单跑）。
4. **不接链 SDK / 不动链适配器**：链上动作保持 operator-declared；不改 `world/**`、`node.key`、`.env.local`。
5. **不改** `docs/ArcBlog-admin-ui-design.md`（REQ-007 写范围）、`docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md` 状态列、`docs/arc-contracts.md`、`CLAUDE.md`、`.agents/skills/**`。
6. **不做** spec §15.8 的「启用开关」写操作（平台边界同 1）；**不做**「Agent 审计日志」页扩围（§15.8 Audit 由 CLI `scripts/arcblog-audit.mjs` ✅，本轮不扩）。
7. **不跑全量 `npm run test:live`**；**不跑** `arc dsl lint --fix`（会误删运行时寻址 id）。
8. **不为「更好看」重写既有页面**；不引入未实测的平台原语（spec §150）。

---

## 3. 验收标准

> 控制台断言在 **admin 会话**下访 `http://arcblog.localhost:4939/?page=<name>`；**身份来源必须在回报里写明**（沿用本机共享调试 Chrome / CDP 时必须注明）。改了 `.aup/**` 必须 `arc dsl generate --write`（如新增键）+ `arc blocklet build` 并核对源 / `dist/`；**每步过快层门**。

**A1 通用门（必过）**
```bash
arc dsl validate --json                            # "issues": []
npm test                                           # 28/28 pass, exit 0（快层，~1s，不写实例）
node scripts/arcblog-console-nav.mjs --check       # exit 0，{"ok":true,"action":"check","pages":17}
arc dsl generate --check                           # 无漂移（dry-run 输出 nothing to change）
arc blocklet build                                 # 改了 .aup/** 必跑；随后逐文件 diff -q 源 / dist/
```

**A2 BUG-010 —— 17/17 页「外壳固定 + 内容列唯一滚动」**

静态（覆盖度 15 → 17）：
```bash
grep -rln 'size={flex: 1} style={overflowY: auto}' .aup/pages/ | wc -l        # 期望 17
grep -n 'size={flex: 1} style={overflowY: auto}' .aup/pages/admin/compose.aup .aup/pages/admin/appearance.aup
#   期望：两页各 ≥1 行，且命中的不是侧栏行（侧栏行含 width: "clamp(200px, 15vw, 280px)"）
```

浏览器（admin，**两个视口 1803×908 与 1512×765**，页面 `?page=compose`、`?page=appearance`）：
```js
(() => {
  const nav = document.querySelector('[data-active="true"]');
  const header = document.querySelector('.aup-app-header');
  const scrollables = [...document.querySelectorAll('*')].filter(el =>
    el.scrollHeight > el.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(el).overflowY));
  const before = { nav: nav.getBoundingClientRect().top, header: header && header.getBoundingClientRect().top };
  scrollables.forEach(el => { el.scrollTop = el.scrollHeight; });
  const after = { nav: nav.getBoundingClientRect().top, header: header && header.getBoundingClientRect().top };
  return {
    vw: innerWidth, vh: innerHeight,
    containerCount: scrollables.length,
    containNav: scrollables.map(el => el.contains(nav)),
    containHeader: scrollables.map(el => !!header && el.contains(header)),
    hasContentColumnOnly: scrollables.some(el => !el.contains(nav) && !(header && el.contains(header))),
    navMoved: Math.abs(after.nav - before.nav) > 2,
    headerMoved: header ? Math.abs(after.header - before.header) > 2 : false,
    pageScrollable: document.scrollingElement.scrollHeight > innerHeight + 2,
  };
})()
```
- 期望（2 页 × 2 视口，共 4 组）：`navMoved === false`、`headerMoved === false`、`hasContentColumnOnly === true`、`pageScrollable === false`。
- 对照（不回退）：`?page=posts` 两视口同样 `navMoved:false`、`pageScrollable:false`。
- 不合格判例（负面）：任一视口出现 `navMoved:true` = BUG-010 未收口。
- **BUG-011 的 1512×765 复现路径依赖本项**：本项修好后，§2.6 / §9 断言的旧「1512 → 1」现象消失——REQ-007 的文档改写与 QA-004 的复跑都必须在这之后按新结构判定（**不是**回归）。

> **🔧 Round 9 修订（BUG-015，PM 2026-09-28）——`navMoved === false` 与 `hasContentColumnOnly === true` 两条字面判据已失效，验收改按 §3.1。原措辞不改写、历史结论不改写。**

**A3 §15.8 Agent 页 —— 策略只读 / 工具三分类 / 授权降级 / grants 列表**

CLI 对照（**只读**；页面呈现必须与之逐项一致）：
```bash
node scripts/arcblog-agent.mjs tools
#   基线：count 19；capabilities ["agent.read","agent.write","agent.publish","agent.economy","agent.admin"]；
#         defaultClosed ["settle_payment","change_wallet","change_role"]；
#         byKind {"read":9,"write":4,"closed":6}；read unavailable: list_studios / get_studio
node scripts/arcblog-agent.mjs check
#   基线：ok true / failed [] / checks 8；policy = {readOnlyOps, blockedOps, neverExposed, defaultClosedTools}
node scripts/arcblog-agent.mjs grants
#   基线：{ "count": 0, "grants": [] }
```
> **PM 基线声明**：以上三条是 PM 在开工前（2026-09-27）实际跑出的值。**Dev 必须在落盘后重跑三条命令并把原始输出附在回报里**；catalogue 若与基线漂移，**以 CLI 实时输出为准**，页面须同步（不得写死基线数字）。

浏览器（admin，`?page=agents`）：
```js
(() => {
  const text = document.body.innerText;
  const names = ["search_posts","get_post","list_categories","get_node_profile","list_products","get_policy","get_analytics","list_studios","get_studio","create_draft","update_draft","publish_post","create_product","get_orders","get_settlements","get_sales","settle_payment","change_wallet","change_role"];
  return {
    missingTools: names.filter(n => !text.includes(n)),
    hasReadGroup: /agent\.read/.test(text),
    hasWriteGroup: /agent\.write|agent\.publish|agent\.economy/.test(text),
    hasClosedGroup: /agent\.admin/.test(text),
    commandPresent: text.includes('node scripts/arcblog-agent.mjs authorize') && text.includes('node scripts/arcblog-agent.mjs revoke'),
    noWriteForm: document.querySelectorAll('form').length === 0 &&
                 [...document.querySelectorAll('input,select,textarea')].length === 0,
    adminNeverGrantable: /agent\.admin/.test(text) && /不可授予|never granted|not grantable|cannot be granted/.test(text),
  };
})()
```
- 期望：`missingTools: []`（19/19 工具名可见）、三个能力分组均出现、`commandPresent: true`、`noWriteForm: true`、`adminNeverGrantable: true`。
- 工具名清单以 **`node scripts/arcblog-agent.mjs tools` 的实时输出为准**（上表为 2026-09-27 基线）。
- grants 列表：`node scripts/arcblog-agent.mjs grants` 的 `count` 与页面行数一致（基线 0）；若为造数写下探针 grant（`authorize`），观察后必须 `revoke` 并复核 `count` 回到 0（**写实例前先写 `docs/team/.gate-lock`**，见 A4）。

**A4 回归、定向单跑与禁止项**
```bash
npm test                                                     # 28/28
npm run test:file -- scripts/arcblog-console-nav.test.mjs     # 7/7（侧栏未变）
grep -rnE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/ | grep -v '\.json' || echo "no hardcoded color"
git diff --name-only | grep -E 'scripts/console-nav\.mjs|blocklet\.yaml|world/' || echo "nav/permission/world untouched"
```
- **定向单跑（仅当改动触及 CLI / AFS 记录 / 链适配器 / daemon 路由）**：若动了 `scripts/arcblog-agent.mjs`、`scripts/lib/agents.mjs` 或 grant 记录形态 → 先在 `docs/team/.gate-lock` 写一行 `owner + 开始时间`，再
  ```bash
  npm run test:file -- scripts/arcblog-agent.test.mjs      # 写实例；跑完删锁
  ```
  **只改页面呈现（`.aup/**` + 生成 locales）时**：不写实例、无需 `.gate-lock`，但回报里必须写明「未动 CLI / 记录，故未跑该文件」。
- **不做全量 `npm run test:live`**（用户 2026-09-27 精简轮裁定）。
- **受限未验证（如实标注，不得推断为通过）**：
  - `/mcp`、`/api/afs/rpc`、`llms.txt` 三个 Agent Access 表面的**运行期可用性**——平台提供、ArcBlog 不实现（spec §129），页面只如实声明；Dev **不实测也不得声称已验证**。
  - admin 身份独立性（沿用共享调试 Chrome 会话时写明来源）。
  - `searchable-dropdown` 首选路径（从未被独立复现，需改 `.aup`）——不在本 REQ 范围。
- **禁止项**：见 §2.2（改标准 / spec / checklist 状态列 / `arc-contracts.md` / `CLAUDE.md` / `world/**` / `blocklet.yaml` / CLI 一律不做；越界即停并上报）。

### 3.1 Round 9 结果记录与 A2 判据修订（PM，2026-09-28；BUG-015 裁决 = 本轮修·判据）

**交付事实（QA 独立复跑，报告 [`test-reports/round-9.md`](../test-reports/round-9.md) §2.1 / §3-B）**

| 验收项 | 结论 | 证据（三类分开） |
| ------ | ---- | ---------------- |
| **A1 通用门** | **通过** | **静态复核**：`arc dsl validate --json` → `"issues": []` exit 0；`npm test` 28/28（首尾各一次）；`console-nav --check` → `{"ok":true,"pages":17}`；`generate --check` → `nothing to change`；7 个改动文件源↔`dist` `diff -q` 全 `same` |
| **A2 BUG-010** | **实现通过；两条字面判据不通过 → BUG-015** | **浏览器实测**（admin，1803×908 / 1512×765）：6 组 `containersContainHeader` **全 `false`**（BUG-010 的原始缺陷面消失）、`headerMoved` 全 `false`、`pageScrollable` 全 `false`；注入 2000px `flexShrink:0` 后只滚内容列 → 6/6 组 `navMoved:false`（compose 2812.5/2955.5、appearance 1311.5/1454.5）；**静态复核**：`grep -rln 'size={flex: 1} style={overflowY: auto}' .aup/pages/` = **17**（compose:117 / appearance:96 命中**内容列**，非侧栏行）。**不满足的两条**：`navMoved` 在 1512×765 为 `true`（**侧栏自身**滚动 130px，不含 header——UI 标准 §2.5 明确允许；**未改动的对照页 `posts` 同样 `true`**）；`hasContentColumnOnly` 在 `appearance @1803×908` 为 `false`（内容未溢出 → 按溢出过滤的集合为空）。**结论：判据措辞缺陷，不是实现缺陷；不需改代码。** |
| **A3 §15.8 Agent 页** | **通过** | **静态复核**（CLI 权威输出）：`tools` → count 19 / `byKind {read:9,write:4,closed:6}` / `defaultClosed` 3 / capabilities 5，`list_studios`+`get_studio` 标 unavailable；`check` → ok true / failed [] / checks 8 / policy 四段（含 neverExposed 11 前缀）；`grants` → count 0。**浏览器实测**：`missingTools: []`（19/19 工具名可见且与 CLI 顺序一致）、三分组齐备、`commandPresent:true`、`noWriteForm:true`（`formCount:0`/`controlCount:0`）、`adminNeverGrantable:true`；grants **非空路径**实测（authorize → 页面 1 行 → revoke → CLI count 0 + 页面空态 + 常驻 CLI 指引）；负面用例 `authorize --capability agent.admin` → `FORBIDDEN` exit 1（fail closed） |
| **A4 回归与禁止项** | **通过** | **静态复核**：`npm test` 28/28、`console-nav.test` 7/7、`runtime-ids` 3/3、无硬编码颜色；`git diff --name-only -- scripts` 空、`-- blocklet.yaml world/ scripts/console-nav.mjs` 空；未跑全量 live；未跑 `arcblog-agent.test.mjs`（`scripts/**` 零改动，如实标注） |
| **受限未验证** | 如实标注 | `/mcp`、`/api/afs/rpc`、`llms.txt` 三个 Agent Access 表面的**运行期可用性**（平台提供，spec §129；页面只如实声明，未实测）；admin 身份独立性（沿用 CDP 9333 共享登录态） |

**A2 判据修订（取代上方 §3 A2 的期望行；等价、可满足、不放宽缺陷面）**

BUG-015 的裁定：原判据把「设计允许的行为」判红——`navMoved === false` 要求**所有**可滚动容器（含侧栏）都不动，与 UI 标准 §2.5「极端窄高下溢出时侧栏自身滚动」直接冲突；`hasContentColumnOnly === true` 在内容短于一屏时必然为 `false`（无溢出容器）。**修订后口径**（Dev 与 QA 结论一致，round-9.md §8；UI 标准 §2.6 已有等价断言块，34/34 实测全绿）：

1. **没有任何可滚动容器包含 `.aup-app-header`**（6/6 组实测 `false`——这是 BUG-010 的原始缺陷面，最强判据）；
2. **`headerMoved === false`** ＋ **`pageScrollable === false`**（6/6 组）；
3. **只滚内容列时 `navMoved === false`**（注入式实测 6/6 组；而不是「一次性滚所有容器」）；
4. **内容列存在**用 UI 标准 §2.6 的等价断言 **`candidates >= 1`**（不依赖当前是否溢出），**不用** `hasContentColumnOnly`；
5. **对照页 `posts`** 同样以 1–4 判定（不再要求 `navMoved:false`——它在 1512×765 本来就按 §2.5 侧栏自身滚动）。

**不合格判例（负面，修订后）**：任一视口出现「可滚动容器包含 `.aup-app-header`」或 `headerMoved:true` 或 `pageScrollable:true` = BUG-010 未收口。

**未做的部分（如实）**：本轮 `compose-edit.aup` 是非控制台页（无侧栏 / 无控制台外壳），不在 §2.1「控制台页」范围 → 未改；是否另立 BUG 由 QA/PM 另议（PM 裁决见 [backlog.md](../backlog.md) 🐞 区 R9 观察项）。

**R9F 补充（PM，2026-09-27）**：本 REQ 交付**未再改动**；清单第 116 行 ✅ 的**唯一前置 BUG-013 已由 [REQ-008](REQ-008-console-inline-write-evaluation.md) / `task-16` 修复并经 QA 复验通过**（zh 下 closed 区 6 行 = `关闭 · agent.economy/admin`，与 CLI `closed(6)` 逐项同序，[round-9-reverify.md](../test-reports/round-9-reverify.md) §3-D）⇒ **D11 的落笔条件已满足，PM 最终建议 Lead 落 ✅**（建议备注文案见 [backlog.md](../backlog.md)「Round 9 checklist 建议」；状态列由 Lead 落笔）。

---

## 4. 依赖

- **前置裁决（已解除）**：BUG-010 已由 PM 裁决「本轮修（R9）」；**L-R9-2**（Lead 2026-09-27）已明确批次顺序与导航/链上约束 → 无阻塞。
- **上游**：Round 8 QA 报告 [`test-reports/round-8.md`](../test-reports/round-8.md) §4 用例 5 / §6 新增 BUG 表；[`bugs/BUG-010-…md`](../bugs/BUG-010-compose-appearance-missing-content-scroll-container.md)；清单第 116 行 + spec §15.8 / §59–§62 / §129–§130；`scripts/arcblog-agent.mjs` 与 `scripts/lib/agents.mjs` 的现状（§1.3 引用的行号）。
- **串行约束（backlog 写范围冲突矩阵批次 A）**：本 REQ 与排队 #3 的其余功能界面项**同写范围**（`.aup/pages/**`）→ **同一 Dev 批次串行**，且 **BUG-010 排批首**；与 REQ-007（`docs/ArcBlog-admin-ui-design.md` + `docs/team/design/**`）**不重叠 → 可并行**。
- **下游**：**QA-004（`task-14`，`blocked_by task-12 + task-13`）** 验收；按 **L-R9-3**，REQ-002 **A17 写入类回归**（admin 行内 Publish / 删除真实点击落库、**tags 队列 worker 执行**）与 **zh locale 逐条目视**并入**同一次 admin 会话**、同报告 `docs/team/test-reports/round-9.md`，写实例前先写 `.gate-lock`、跑完删锁并清理探针记录。
- **外部条件**：可写 dev 实例（`?page=agents` grants 基线 **0 条**；如需非空验证用 `authorize` 造 1 条 → 观察 → `revoke` → 复核 `count` 回 0，全程 `.gate-lock`）；浏览器验证可能需 `arc dsl generate --write` + `arc blocklet build` + daemon 重启（UI-001 A19 记录）。
- **checklist 状态列**：本项完成后**建议**第 116 行「Agent 能力与工具页」🟡 → **✅ 候选**；第 98 行「控制台外壳」备注追加「BUG-010 已收口」。**状态列由 Lead 轮末落笔**（PM 只给建议）。

---

## 5. 涉及写范围

| 路径前缀 | 用途 | 归属 |
| -- | -- | -- |
| `.aup/pages/admin/compose.aup`、`.aup/pages/admin/appearance.aup` | BUG-010：内容列滚动容器 | Dev |
| `.aup/pages/ops/agents.aup` | §15.8：工具清单 / 策略只读 / 授权 CLI 指引 / grants 列表 | Dev |
| `.aup/locales/{en,zh}.json` | 由 `arc dsl generate --write` 生成（不手改）；新键必须声明在所属页 `i18n {}` | Dev（生成） |
| `.aup/app.json`、`.aup/wrapper.json` | `arc dsl generate --write`（如有漂移） | Dev（生成） |
| `dist/**` | `arc blocklet build` 生成（不手改） | Dev（生成） |
| `docs/team/test-reports/**`、`docs/team/bugs/**` | R9 验收报告与 BUG 状态 | QA |
| `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 看板 / 本 REQ / 轮次日志 | PM |
| `scripts/console-nav.mjs`、`blocklet.yaml`、`world/**`、`scripts/arcblog-agent.mjs`、`scripts/lib/agents.mjs` | **本 REQ 不改**（导航不新增节；权限 / 世界 / CLI 保持现状） | 越界即停手上报 |
| `docs/ArcBlog-admin-ui-design.md`、`docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/arc-contracts.md`、`CLAUDE.md`、`.agents/skills/**` | **本 REQ 一律不改** | UI / Lead |

**边界**：越界即停并上报 PM / Lead；**不臆造 ARC API**（spec §150）——平台不支持的「页面内授权」走 **CLI 降级路径**并在页面与回报里如实标注。
