# REQ-008 — 控制台行内写动作「模板求值」收口（BUG-012 P1 + 同类写法普查 + BUG-013 i18n）

**元信息**：REQ-008 ｜ 对应 spec 章节：**§15.4 文章/页面生命周期管理 · §15.6 Hub 关系管理 · §130 Agent 工具与默认关闭** ｜ checklist 行：D 组第 **100** 行「文章管理（列表 + 生命周期操作）✅」、第 **101** 行「页面管理 ✅」、第 **110** 行「Hub 管理 ✅」、第 **116** 行「Agent 能力与工具页 🟡→✅ 候选」（BUG-013 是其后置条件）；**本 REQ 不改 checklist 状态列**（由 Lead 落笔）｜ 优先级：**P1（BUG-012，阻断）** ＋ P2（BUG-013）｜ 提出轮次：**Round 9**（Round 9 QA-004 首次真实点击发现）｜ 负责角色：**Dev** ｜ 状态：**已交付并复验放行**（R9F 修复窗口：Lead D9 开窗 → Dev `task-16` → QA `task-18` 独立复验 **`VERDICT=pass, BLOCKING=0`**；结果记录见 **§3.1**；遗留 2 条 P3 = BUG-016/017，PM 裁决见 backlog 🐞 区）

---

## 1. 背景

### 1.1 BUG-012（P1，阻断；QA 真实点击发现，PM 静态复核确认）

- 缺陷文件：[`bugs/BUG-012-posts-inline-row-actions-write-literal-entry-template.md`](../bugs/BUG-012-posts-inline-row-actions-write-literal-entry-template.md)；QA 报告 [round-9.md](../test-reports/round-9.md) §3-H / §6 / §8。
- **实测事实**（QA，2/2 确定性复现）：`?page=posts` 行内 **Publish** / **Delete** 真实点击 + 页面内确认框后弹成功提示（`Published.` / `Record soft-deleted.`），但**目标记录不落库**——实际写入 `posts/${entry.content.slug}.json` / `drafts/${entry.content.slug}.json`（**字面量路径**、全字段未插值、`status` 却是 `published` / `deleted`）；源 draft 保持 `status: draft`。垃圾记录位于 guest 可读的 `posts/` → 进入 `arcblog-query-posts.mjs published` 与 **公开 RSS**（`<title>${entry.content.seoTitle}</title>`）。
- **PM 静态复核**（2026-09-28，本轮；命令与输出见 §3 A0）确认 QA 的「疑似文件」定位：
  - 出错写法（`exec` 的 **`args` 里**出现 `${entry.content.*}`）：`.aup/pages/admin/posts.aup` **189**（草稿行 Publish）、**190**（草稿行 Delete）、**170**（已发布行 Archive）、**169**（已发布行 Detail，写固定路径但 content 同型）、`.aup/pages/admin/pages.aup` **157**（act-offline）、**178**（act-publish）、`.aup/pages/ops/hub.aup` **147 / 148**（Approve / Reject，`args.path` 亦为模板）。
  - 对照写法（**属性** `path="…${entry.content.slug}.json"`，`CLAUDE.md` 记载可求值）：`.aup/pages/admin/posts.aup` **171**、`.aup/pages/admin/pages.aup` **158 / 179**、`.aup/pages/site/categories.aup` **123**。
  - 不同取值来源（`${args.*}` / `${state.*}`，**不得据本 BUG 推断同坏**）：`compose.aup:146/147`、`compose-edit.aup:70/71`、`preview.aup:35/36`、`seo.aup:119`、`heroes.aup:155/182`、`tags.aup:135/205`、`factory.aup:168–171`、`pages.aup:136`。
- **平台依据**：`CLAUDE.md`「AUP runtime conventions」——`${entry.*}` 替换在 `afs-list` item 模板与 action **props**（如 `path="${entry.path}"`）有效，而 **`args` templates are still unverified**；`docs/arc-contracts.md` 有 `-> set` 的 `args` 不解析 `${entry.content.*}` 的同类记录；QA 实测结论 = 运行时只做**单层**替换（`${args.slug}` ← 行模板原始串 `${entry.content.slug}`，无第二遍求值）。
- **影响**：admin 的**主操作不可用**（写了错路径 + 错内容，且成功提示与真实结果相反）＋ **公开面被污染**（guest 可见 feed / RSS）。可绕过（CLI `arcblog-lifecycle.mjs publish` 正常）。
- **pre-existing**：`posts.aup` 本轮 `git diff` 为空，`shasum -a 256` 与 round-8 §0 记录逐字相同（非 Round 9 引入）。

### 1.2 BUG-013（P2，本轮新增；i18n）

- 缺陷文件：[`bugs/BUG-013-agents-closed-status-not-localized.md`](../bugs/BUG-013-agents-closed-status-not-localized.md)。
- R9 §15.8 升级新增的「关闭工具（6）——永不暴露（spec §130）」分区在 zh locale 下 6 行 + 图例仍为英文 `closed`（同页 `read`/`write` 两类已用 `$t(agents.status-available)` / `$t(agents.status-unavailable)` 本地化）。
- **PM 静态复核**（2026-09-28）确认：`.aup/pages/ops/agents.aup:169` 为硬编码 `value: "closed · agent.economy"` 等 6 项，页级 `i18n {}`（第 30/31 行只有 `status-available` / `status-unavailable`）与 `.aup/locales/{en,zh}.json`（第 505/506 行）**都没有** `status-closed` 键。
- 判据：`docs/ArcBlog-admin-ui-design.md` §9「i18n：中英文布局都成立」；同页两类状态词已本地化 → 本类应同口径。

### 1.3 为什么本项是**新需求**而不是「顺手修一下」

1. BUG-012 的根因不是一条行，而是一种**写法类别**（`exec` 的 `args` 里放行模板变量）。同一类别在 `posts` / `pages` / `hub` 三个页面的续命周期操作上都有候选行（§1.1 静态复核），其中 `pages.aup:157/178`、`hub.aup:147/148` **从未被任何一轮点击验证**（round-9 report §7 已如实登记为受限项）。只修 189/190 会把同类缺陷留在原位。
2. `hub.aup:147/148` 的 `args.path` 用的是 `${entry.path}`（不是 `${entry.content.slug}`）——`path=` **属性**形式已记载可求值，但**放进 `args` 里是否也求值，未实测**；这直接决定「Hub 关系行内通过/终止」是否同样是 P1。**不得臆测**，必须实测。
3. BUG-013 与 BUG-012 同属一个 Dev 批次写范围（`.aup/pages/**` + 生成 locales），可一并收口；单独留一轮会重复 touch `npm test` 快层与 `dist/`。

---

## 2. 范围

### 2.1 做

| 组 | 条目 | 内容 |
| -- | ---- | ---- |
| **A（P1）** | **修 BUG-012** | 把 `.aup/pages/admin/posts.aup` 的行内写动作改成**可求值**写法（候选：改用 `path=` **属性**形式——与同文件 171 行、`pages.aup:158/179`、`categories.aup:123` 一致；或改用运行时确实会求值的 `args` 来源）。**至少覆盖 189（Publish）/ 190（Delete）/ 170（Archive）三条**，并用真实点击验证。写法选择由 Dev 依 `arc dsl schema` / `arc-contracts.md` 实测决定，**不得臆造 ARC API**（spec §150）。 |
| **B（P1）** | **同类写法普查（不得只修 189/190）** | 对 §1.1 静态复核列出的**每一个 `exec` 的 `args` 内含 `${entry.*}` 的写/删动作**逐条给出实测结论，三态之一：**求值 ✓ / 写成字面量 ✗ / 未实测（+原因）**。必查清单：`posts.aup:169,170,189,190`、`pages.aup:157,178`、`hub.aup:147,148`。**对照清单**（应验证「属性写法确实可求值」这一假设，至少 1 条真实点击）：`posts.aup:171`、`pages.aup:158,179`、`categories.aup:123`。**不同取值来源清单**（`${args.*}`/`${state.*}`：`compose.aup`、`compose-edit.aup`、`preview.aup`、`seo.aup`、`heroes.aup`、`tags.aup`、`factory.aup`、`pages.aup:136`）**只登记、不据此断言坏**——若要判定，必须单独实测并在回报里给原始输出。 |
| **C（P2）** | **修 BUG-013** | `.aup/pages/ops/agents.aup`：新增页级 `i18n {}` 键 `status-closed { en "closed" zh "关闭" }`（措辞由 Dev 定，需与 `可用`/`不可用` 同风格），并把 169 行 6 项 `value: "closed · …"` 改为 `value: "$t(agents.status-closed) · …"`；`arc dsl generate --write` 后快层死键门必须绿。 |
| **D** | **普查发现的同型缺陷** | 若普查确认 `pages.aup:157/178` 或 `hub.aup:147/148` 同型失败：**与 A 同批修**（同属 `.aup/pages/**`、同一次 build/复验），在回报中逐条列出；若判定需要改 CLI / AFS 记录形态 → **停手上报 PM/Lead**。 |

> **基线口径**：A 组与 B 组的「正确性」定义 = **真实点击后目标记录按 slug 落库**，不是「弹窗无报错」。成功提示与落库不一致本身就是缺陷的一部分。

### 2.2 明确不做

1. **不改 CLI / `scripts/**`**：`scripts/arcblog-lifecycle.mjs`、`scripts/lib/agents.mjs` 等保持现状（CLI 路径本轮实测正常）。若 Dev 判断确需改动 → **先停手上报**（会触发定向单跑 live 文件）。
2. **不改 AFS 记录 schema（`world/**`）、`blocklet.yaml` 权限表、链适配器、daemon 路由**；**不新增 AFS 集合**。
3. **不改** `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md` 状态列、`docs/ArcBlog-admin-ui-design.md`、`docs/arc-contracts.md`、`CLAUDE.md`、`.agents/skills/**`（分别属人类 / Lead / UI 写范围）。
4. **不跑全量 `npm run test:live`**（用户 2026-09-27 精简轮裁定）；**不跑** `arc dsl lint --fix`（会误删运行时寻址 id）。
5. **不对未实测的写法下结论**：`${args.*}` / `${state.*}` 形态（compose / compose-edit / preview / seo / heroes / tags / factory）**不得**据 BUG-012 推断已坏；只能登记为「未实测 + 原因」。
6. **不触碰真实已发布内容**：`posts/` 当前 3 篇真实文章**不得**用「Remove from public / 彻底删除」类动作验证（会真删）。需要「已发布行」的验证场景一律**先造 `posts/<probe-slug>.json` 探针**，观察后删除。
7. **不修** BUG-014 / BUG-015（分别属 UI 文档与 PM 判据，见 backlog 🐞 区裁决）。
8. **不做**像素级视觉走查、不新增导航节、不接链 SDK。

---

## 3. 验收标准

> **写实例纪律（强制）**：任何真实点击 / `arc afs` 写入前，先在 `docs/team/.gate-lock` 写一行 `owner + 时间 + 用途`；跑完**删除锁**并**逐条清理探针记录**；回报必须含「实例零残留」复核输出。参照 round-9 report §3-J。
> **身份来源必须在回报里写明**（沿用本机共享调试 Chrome / CDP 9333 时必须注明）。

**A0 PM 静态复核基线（只读；Dev 开工前可重跑）**
```bash
# 出错写法候选（args 里带 entry.*）
grep -n 'exec: "/.actions/write"' .aup/pages/admin/posts.aup | grep -c 'entry.content'
#   PM 实测（2026-09-28）：≥4（169/170/189/190 同型）
grep -n 'entry.content' .aup/pages/admin/pages.aup | grep -c 'exec: "/.actions/write"'
#   PM 实测：2（157/178）
grep -n 'exec: "/.actions/write"' .aup/pages/ops/hub.aup | grep -c 'entry.content'
#   PM 实测：2（147/148，且 args.path 为 "${entry.path}"）
grep -n 'path="/instance/app/arcblog/.*${entry.content.slug}' .aup/pages/ -r
#   PM 实测：posts.aup:171 / pages.aup:158,179 / categories.aup:123（属性写法对照）
```

**A1 通用门（必过）**
```bash
arc dsl validate --json                          # "issues": []
npm test                                         # 快层 28/28 pass, exit 0（~1s，不写实例）
node scripts/arcblog-console-nav.mjs --check     # {"ok":true,"action":"check","pages":17}（不新增导航节）
arc dsl generate --check                         # 无漂移
arc blocklet build                               # 改了 .aup/** 必跑；随后逐文件 diff -q 源 / dist/
```

**A2 BUG-012 修复 —— 真实点击后按 slug 落库（含归档行与公开面复核）**
```bash
# 0) 写锁
printf 'Dev <name> <ISO8601> — REQ-008 A2 inline-write probes\n' > docs/team/.gate-lock
# 1) 造探针：一条 draft（用于 Publish / Delete）
#    node scripts/arcblog-lifecycle.mjs ... 或 AFS 直写 drafts/<probe-slug>.json（slug 不含 ${}）
# 2) admin 会话真实点击（CDP / 浏览器）：
#    ?page=posts&locale=en → 草稿行「Publish」→ 确认框 → 复核
#    ?page=posts&locale=en → 草稿行「Delete」 → 确认框 → 复核
# 3) 造一条 posts 探针后点击已发布行「Archive」→ 复核 drafts/<probe-slug>.json
```
- 期望（**逐条给原始输出**）：
  1. Publish 后 `posts/<probe-slug>.json` **存在**，且 `title`/`slug`/`body` 等字段是**已求值的真实值**（不等于 `${entry.content.title}` 之类模板串）；源 draft 按设计消失或状态变更。
  2. Delete 后 `drafts/<probe-slug>.json` 的 `status === "deleted"`，源 draft 记录被更新（不是另写字面量文件）。
  3. Archive 后 `drafts/<probe-slug>.json` 的 `status === "archived"`。
  4. **全库无字面量记录**：列出 `posts/` 与 `drafts/` 的 id，**没有任何 id 含 `${`**；`node scripts/arcblog-query-posts.mjs published` 与 `node scripts/arcblog-rss.mjs --feed-link …` 输出**不含** `entry.content` 字样。
  5. 成功提示与真实结果一致（不再「弹成功但没落库」）。
- 负面用例（≥1 条）：断言「**错误的旧写法**会把模板串写进文件名」的判据，在修复后应**不再复现**（例如修复前后各点一次，给出两次的 AFS 路径对比）。
- 收尾：删除全部探针（`posts/<probe-slug>.json`、`drafts/<probe-slug>.json`、任何字面量垃圾记录如 `posts/${entry.content.slug}.json`）+ 删锁；复核回到初始（`posts=3 / drafts=27`，字面量 id 为空）。

**A3 同类写法普查表（B 组；这是本 REQ 与「只修一条」的分界线）**

回报里必须给出下表（**每行都要有实测结论或「未实测 + 原因」**，不得留空、不得用推断代替）：

| 行 | 写法 | 要求 |
| -- | ---- | ---- |
| `posts.aup:169`（Detail，写固定 `/node/post-detail.json`） | `args` + `entry.content.*` | 实测 content 是否求值（路径固定，故缺陷面是内容） |
| `posts.aup:170`（Archive） | 同上 | **实测并修复** |
| `posts.aup:189 / 190`（Publish / Delete） | 同上 | **实测并修复（BUG-012 本体）** |
| `pages.aup:157`（act-offline）/ `178`（act-publish） | 同上 | **实测**；同型失败则同批修 |
| `hub.aup:147 / 148`（Approve / Reject） | `args.path` = `${entry.path}` + content `entry.content.*` | **实测 `args.path` 是否求值**（决定是否同为 P1） |
| `posts.aup:171` / `pages.aup:158,179` / `categories.aup:123` | **属性** `path="…"` | **至少 1 条真实点击**验证「属性写法可求值」 |
| `compose*.aup` / `preview.aup` / `seo.aup` / `heroes.aup` / `tags.aup` / `factory.aup` / `pages.aup:136` | `${args.*}` / `${state.*}` | 只登记；**未实测必须写「未实测 + 原因」** |

- 期望：普查表覆盖 §2.1 B 组全部候选行；**凡实测为「写成字面量 ✗」的行，修复后须再实测为「求值 ✓」**。
- **不得**把「同文件已有一条修好」当作其余行也修好的证据。

**A4 BUG-013 i18n**
```bash
grep -c 'status-closed' .aup/pages/ops/agents.aup .aup/locales/en.json .aup/locales/zh.json   # 三处均 ≥1
grep -c 'value: "closed ·' .aup/pages/ops/agents.aup                                        # 期望 0
npm test                                                                                      # 死 locale 键门必须绿（声明了就要渲染）
```
- 期望：zh 下「关闭工具（6）」6 行状态词为**中文**（与 `可用`/`不可用` 同口径），en 下仍为 `closed`；`?page=agents` 其余内容不变。

**A5 回归与范围**
```bash
npm test                                                          # 28/28
node scripts/arcblog-console-nav.mjs --check                      # 17 页
grep -rnE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/ | grep -v '\.json' || echo "no hardcoded color"
git diff --name-only | grep -E '^scripts/|^world/|^blocklet\.yaml' || echo "CLI/world/permissions untouched"
diff -q 逐文件（改动的 .aup + locales + dist 副本）                  # 全部 same
```
- **定向单跑（仅当改动触及 CLI / AFS 记录形态 / 链适配器 / daemon 路由）**：先在 `.gate-lock` 写 owner + 时间，再
  ```bash
  npm run test:file -- scripts/arcblog-lifecycle.test.mjs      # 文章生命周期落库（写实例）
  ```
  **若只改页面标记写法（`.aup/**`）且记录 schema 不变**：写明「未动 CLI / 记录形态，故未跑 live 文件」。
- **不做全量 `npm run test:live`**。

**A6 写实例纪律与受限项（如实标注，不得推断为通过）**
- `.gate-lock` 已写并已删除；探针记录全部清理；`posts=3 / drafts=27 / tags/intents=0 / config/agent-grants=0`，无 `probe` / 字面量残留。
- **受限未验证**：`${args.*}` / `${state.*}` 形态（compose / compose-edit / preview / seo / heroes / tags / factory）**若本轮未实测**，必须写「未实测 + 原因」；不得声称已覆盖。
- **公开面影响**：QA 已在 round-9 观察后清除了污染记录；若修复后再次出现垃圾记录，须在回报中列出清理动作。

---

### 3.1 R9F 结果记录与 A2.1 口径修订（PM，2026-09-27）

**执行事实**：Lead **D9 裁定加开 R9F 修复窗口**（`task-16` Dev / `task-17` UI 修 BUG-014 / `task-18` QA / `task-19` PM）；**BUG-014 属 UI，不在本 REQ 的 A/B/C/D 组内**（Lead **D10** 一行授权，结果见 [backlog](../backlog.md) 🐞 区与 [round-9-reverify.md](../test-reports/round-9-reverify.md) §3-E）。

| 验收项 | 结论 | 证据（QA 独立运行，[round-9-reverify.md](../test-reports/round-9-reverify.md)） |
| ------ | ---- | -------------------------------------------------------------------------------------- |
| **A1 通用门** | **通过** | §3-A：`arc dsl validate --json` → `"issues": []`；`npm test` → 28/28；`console-nav --check` → `pages:17`；`generate --check` → 无漂移；无硬编码颜色；源↔`dist` 逐文件 `same`；`git diff --name-only -- scripts world blocklet.yaml` 空 |
| **A2 BUG-012 修复** | **通过** | §3-B1/B2/B3/B4/B5：新造探针真实点击 → **Publish** 落 `posts/qa-r9f-pubprobe.json`（真实 slug + 全字段已求值）、**Delete** → `drafts/…{status:deleted,deletedAt:17:32:19.771Z}`、**Archive**（:170）→ `drafts/…{status:archived}`、**Remove from public**（:171，`path=` 属性对照）→ 公开记录被删；**全库 `literal-template ids=[]`**、`exec` args 内 `entry.*` = **0** |
| **A2 公开面** | **通过** | §3-C：`arcblog-query-posts.mjs published` 字段全真实、RSS `<title>` 无模板串、`grep -c 'entry.content'` = **0**；清理后回落 baseline（`published total 2`） |
| **A3 同类写法普查** | **通过（逐行结论）** | §3-F：`posts:170` ✓、`posts:189/190` ✓、`posts:171`（属性）✓、`pages:157` ✓、`pages:158`（属性）✓、`pages:184` ✓（条件下）、`hub:147/148` ✓（`${args.ePath}` ← `${entry.path}`）；**未点击** = `posts:169`（Detail，写真实 `node/post-detail.json`）、`hub:149`（Purge，会删真实收录记录）→ 受限项；`${args.*}`/`${state.*}` 登记组未实测 |
| **A4 BUG-013 i18n** | **通过** | §3-D：zh 6 行 = `关闭 · agent.economy/admin`，与 `arcblog-agent.mjs tools` 的 `closed(6)` **逐项同序**；无 `$t(` 泄漏/裸 key；en 仍 `closed`；`status-closed` 三处命中（`agents.aup:2`/`en.json:1`/`zh.json:1`）、`value: "closed ·` = 0；死键门绿 |
| **A5 回归与范围** | **通过** | §3-A/§3-G：门全绿；`scripts/`·`world/`·`blocklet.yaml` 零改动；**未跑全量 live、未跑定向 live 文件**（符合 A5 的「记录形态未变」条件） |
| **A6 写实例纪律** | **通过** | §7：写锁两段（`17:31:41Z` / `17:39:48Z`）→ 跑完 `rm -f docs/team/.gate-lock` → `ls` 报 No such file；5+1 条探针逐条 `removed`；清理后 `posts=3 / drafts=27 / pages=1 / page-drafts=0 / hub-registrations=4 / node=32 / tags-intents=0 / config-agent-grants=0`，探针 `present?` 全 `false` |

**A2.1 判据括注修订（PM 裁决，2026-09-27）**：A2 期望第 1 条原括注「源 draft 按设计消失或状态变更」**字面不成立**——页面 Publish 是「**复制到公开**」语义（R9F 实测：`posts/<slug>.json` 正确落库，`drafts/<slug>.json` 仍 `status: draft`，与同页 Archive「在 drafts 保留副本」一致；页面 confirm 文案只写「这会发布当前草稿记录」、未承诺移除源 draft）。

- **修订后的口径**：**Publish 正确性 = `posts/<probe-slug>.json` 存在且字段为已求值的真实值（不等于模板串）**；**源 draft 保持原状是当前页面设计**，不再作为判据的一部分。
- **注意（已登记，不在本 REQ 修）**：CLI `publish` 是**移动**语义（[`scripts/arcblog-lifecycle.mjs`](../../../scripts/arcblog-lifecycle.mjs) 第 470 行写 public 后 `arcDelete(drafts/<slug>.json)`）⇒ 页面「复制」与 CLI「移动」不一致，页面 Publish 后该条**仍留在草稿列表**。属**产品口径**问题 → 已登记 **R10 排队 #15（Lead 决策 D14）**，**本 REQ 不改页面/CLI**。
- 原期望行保留（**不改写历史结论**），仅按本条修订执行口径。

**R9F 遗留（均 P3、不阻断；详见 [backlog](../backlog.md) 🐞 区与 [round-9-reverify.md](../test-reports/round-9-reverify.md) §5/§6）**：**BUG-016**（hub 行内重写把 `sync.lastVersion` 改型，`null→""`、数字→字符串；PM 裁「R10 · Dev 先出评估结论」）、**BUG-017**（旧 CLI/root 授权公开副本存在时 pages Bring online 被平台诚实拒绝，无写；PM 裁「R10 · 依赖产品裁决 D13」）、`hub:149`/`posts:169` 未单击、`${args.*}/${state.*}` 登记组未实测。

---

## 4. 依赖

- **上游**：Round 9 QA 报告 [`test-reports/round-9.md`](../test-reports/round-9.md) §3-H（A17 写入类回归）/ §3-G（zh locale）/ §6 / §8；[`bugs/BUG-012-…md`](../bugs/BUG-012-posts-inline-row-actions-write-literal-entry-template.md)、[`bugs/BUG-013-…md`](../bugs/BUG-013-agents-closed-status-not-localized.md)；`CLAUDE.md`「Entry substitution / args templates are still unverified」；`docs/arc-contracts.md` 的 `-> set` args 不解析记录。
- **前置裁决（已解除）**：**Lead D9（2026-09-27）已裁定加开 R9F 修复窗口**并建任务（Dev `task-16` / UI `task-17` / QA `task-18` / PM `task-19`）；**本 REQ 已交付并复验放行**（§3.1）。
- **下游（复验）**：**QA** 必须**独立重跑** A2（真实点击 + AFS/公开面复核，不得采信 Dev 自述）与 A3（抽查至少 2 行，含 `hub.aup:147` 的 `args.path`）、A4（zh 逐条目视）。复验报告落 `docs/team/test-reports/`。
- **串行约束**：本 REQ 的写范围（`.aup/pages/**`）与「功能界面补全」**同范围 → 同一 Dev 批次串行**（R9F 已完成，后续批次见 [backlog](../backlog.md) 排队 #3/#13/#14/#15）；与 UI 文档类需求（`docs/ArcBlog-admin-ui-design.md`）**不重叠 → 可并行**。
- **外部条件**：admin 会话（本机共享调试 Chrome / CDP 9333 登录态）；可写 dev 实例；`.gate-lock`。

---

## 5. 涉及写范围

| 路径前缀 | 用途 | 归属 |
| -- | -- | -- |
| `.aup/pages/admin/posts.aup` | BUG-012 本体（189/190，必含 170；169 待普查判定） | Dev |
| `.aup/pages/admin/pages.aup` | 普查：157/178（同型则修） | Dev |
| `.aup/pages/ops/hub.aup` | 普查：147/148（`args.path` 求值性） | Dev |
| `.aup/pages/ops/agents.aup` | BUG-013：`status-closed` 键 + 169 行 6 项 | Dev |
| `.aup/locales/{en,zh}.json` | `arc dsl generate --write` 生成（**不手改**；新键必须声明在所属页 `i18n {}`） | Dev（生成） |
| `.aup/app.json`、`.aup/wrapper.json` | `arc dsl generate --write`（如有漂移） | Dev（生成） |
| `dist/**` | `arc blocklet build` 生成（**不手改**） | Dev（生成） |
| `docs/team/test-reports/**`、`docs/team/bugs/**` | 复验报告 | QA |
| `docs/team/backlog.md`、`docs/team/requirements/**`、`docs/team/journal/**` | 看板 / 本 REQ / 轮次日志 | PM |
| `scripts/**`、`world/**`、`blocklet.yaml`、`.web/**`、`seed/**` | **本 REQ 不改**（判需改动即停手上报） | 越界即停 |
| `docs/ArcBlog-product-technical-spec.md`、`docs/ArcBlog-feature-checklist.md`、`docs/ArcBlog-admin-ui-design.md`、`docs/arc-contracts.md`、`CLAUDE.md`、`.agents/skills/**` | **本 REQ 一律不改** | 人类 / Lead / UI |

**边界**：**不臆造 ARC API**（spec §150）——写法选择必须经 `arc dsl schema` / `arc-contracts.md` / 实测核验；平台不支持的形态走**如实登记 + 降级/上报**路径，不猜。
