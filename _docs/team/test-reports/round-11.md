# round-11 测试报告（spec §15.9「通用 General」控制台页 + 命名/落点降级 + UI-007 独立复核）

> **角色**：QA（独立验证者）｜**轮次** Round 11（精简轮，2026-09-28）｜**任务** task-28（QA 独立验证）
> **写范围**：本文件 + `docs/team/bugs/BUG-021…025-*.md`（QA 独有）。**未改任何源码/测试/文档/`.aup`/`dist`。**
> **被测产物**：`.aup/pages/admin/settings-general.aup`（新页）、`scripts/console-nav.mjs`（17→18 节）、`scripts/lib/general-settings.mjs`（新）、`scripts/arcblog-settings.mjs`（`general install|show|set`）、`scripts/arcblog-rss.mjs`、`scripts/arcblog-agent.mjs`（消费方接线）、`dist/**`（重生成）。
> **快照**：工作区 HEAD `17aac1f` + Dev 本轮未提交改动（`git status` 见 §1.1）。UI-007 报告的偏差行号与本报告一致（同一快照）。

**结论（一句话）**：**放行（pass）**。质量门 4/4 全绿且 `dist` 与源码逐文件同源；spec §15.9 通用 General 的六个字段**页面真实可读可写**、三个开关逐个有「影响范围 + 消费方状态」文案、有消费方的两个开关**即时生效**已端到端复核；无 P0、无 P1（QA 分级）；新增 **5 条 P2**（BUG-021…025，全部在新建页面上）。两条**降级**需 Lead/PM 明确接受（页面名 `settings-general`、记录落点 `config/{general,switches}`）。

---

## 0. 验证方式与边界（结论怎么来的）

- **独立复跑门**：`arc dsl validate --json`、`npm test`、`arc dsl generate --check`、`node scripts/arcblog-console-nav.mjs --check` 全部**由 QA 自己执行**（§3.A）。**未跑全量 `npm run test:live`**（用户 2026-09-27 裁定）。
- **定向 live**：本轮改动触及 CLI / AFS 记录 / CLI 消费方，故按手册 §6.1 先在 `docs/team/.gate-lock` 落盘（`owner=qa-round11`，09:16:43），串行单跑三个受影响文件（§3.B），跑完删锁（§8）。
- **不读自述当依据**：Dev/UI 的报告只作**线索**（例如 Dev 建议复核「CLI 创建的记录从页面不可写」、UI 报告 V1–V9 的期望值），全部结论来自本轮真实命令输出与 CDP 实测；与自述冲突处**以实测为准**并在 §6/§7 明确写出（例：Dev 的该条建议被实测推翻 → BUG-022）。
- **浏览器**：共享调试 Chrome 的 CDP `http://127.0.0.1:9333`；admin = 默认上下文（已有登录态），guest = `Target.createBrowserContext` 隔离上下文（无 cookie）。临时脚本全部在 `/tmp/qa11-*.mjs|json`，未入库。
- **验收依据**：spec §15.9（L1247–L1294）、`docs/team/requirements/SPEC-REVIEW-001-*.md`（A.2 §15.9 / B.13 / D 表 P0-1）、UI-007 走查报告、以及本轮任务书里的断言 ①–⑤。
- **写入类行为一律以 AFS 记录为准**（`arc afs exec /blocklets/arcblog/.actions/read`，arc-contracts §29.4），**不看 toast**。

**本轮实测的边界（不当作已验证）**

1. **未跑全量 `npm run test:live`**（用户裁定）；只定向单跑 3 个文件。
2. **未重启 daemon**（`arc service restart`）——Dev 自述「页面写入跨 restart 仍可写」**未独立验证**（避免打断共享实例上的其他成员）。本轮已证明的替代事实是：CLI seed 出来的六条记录**当场**全部可从页面写入（§3.D）。
3. `?page=settings` 这条断言**无法按字面满足**：`settings` 是 AUP 保留关键字（§3.C 实测），页面名只能是 `settings-general`；该命名降级需 Lead/PM 接受（§7-1）。
4. 记录落点在 `config/{general,switches}`（非 `/instance/settings/arcblog/`）；平台设置面为何不可用属 Dev 的探针结论，QA 只验证了**页面与 CLI 读写、消费方接线**这三件可观察事实，**未复现**「平台 settings mount 是 seed 驱动闭集」的探针本身（列为受限，§7-3）。
5. 未做深色模式、非 admin 已登录会话、行内写操作的跨浏览器行为。

---

## 1. 被测产物与构建一致性

### 1.1 工作区状态（本轮被测改动，`git status --short` 摘录）

```text
 M .aup/app.json / .aup/locales/{en,zh}.json / .aup/wrapper.aup
 M .aup/pages/admin/*.aup（含 compose/appearance/dashboard/posts/pages）
 M .aup/pages/site/*.aup  M .aup/pages/ops/*.aup  M .aup/pages/economy/*.aup
 M scripts/console-nav.mjs  M scripts/arcblog-settings.mjs  M scripts/arcblog-rss.mjs  M scripts/arcblog-agent.mjs
?? .aup/pages/admin/settings-general.aup        ← 新页（Dev 本轮）
 M dist/**（对应重生成，含 dist/.aup/pages/admin/settings-general.aup）
 M docs/ArcBlog-admin-ui-design.md               ← UI 的 1 处标准事实修正（L-R11-2）
```

### 1.2 源码 ↔ `dist` 一致性（**本轮全部 same，无漂移**）

```text
$ diff -r .aup dist/.aup                                  →（无输出，exit 0）
$ diff -rq scripts dist/scripts                           →（无输出）
$ diff -q .aup/locales/en.json dist/.aup/locales/en.json  → SAME
$ diff -q .aup/locales/zh.json dist/.aup/locales/zh.json  → SAME
$ ls -la dist/scripts/lib/general-settings.mjs
-rw-------  1 shenxiang  staff  7693  9月 28 09:01 dist/scripts/lib/general-settings.mjs   ← 新模块已进 dist
```

> QA **未执行** `arc blocklet build`（它会写 `dist/**`，不在 QA 写范围）；改用**只读 diff** 证明 `dist` 已是源码的当前产物。

### 1.3 硬编码颜色（**0 命中**）

```text
$ grep -nE "#[0-9a-fA-F]{3,8}\b|rgb\(|rgba\(|hsl\(" .aup/pages/admin/settings-general.aup
(none in settings-general.aup)
$ for f in .aup/pages/**/*.aup; do grep -cE '#[0-9a-fA-F]{3,8}\b|rgba?\(' "$f"; done | awk '$1>0'   →（无输出）
```

### 1.4 侧栏模型（17→18 节）

```text
$ node -e "import('./scripts/console-nav.mjs').then(m=>{console.log(m.CONSOLE_SECTIONS.length);console.log(m.CONSOLE_SECTIONS.join(','))})"
18
dashboard,posts,pages,compose,heroes,categories,tags,seo,feeds,appearance,operations,hub,media,agents,policy,access,factory,settings-general
$ node scripts/arcblog-console-nav.mjs --check
{ "ok": true, "action": "check", "pages": 18 }
```

---

## 2. 逐条验收结论表

### 2.1 本轮任务书的浏览器断言 ①–⑤

| # | 验收标准（任务书原文摘要） | 结论 | 证据（§3 小节 / 原始命令） |
| -- | ---- | ---- | ---- |
| ①a | `?page=settings`：无 `SESSION INIT FAILED` | **受限（该页不存在）** | `?page=settings` → 静默回落公开首页、**无** SESSION INIT FAILED（§3.C-1）。字面条目不可满足 → §7-1 |
| ①b | 真实设置页无 `SESSION INIT FAILED` | **通过** | `?page=settings-general`：`hasFail:false`，`bodyLen 2726`（§3.C-2） |
| ①c | 站点名称/语言/时区/三个开关四类控件渲染且有非零几何 | **通过** | 3×`input[name=eValue]` 可见 `698×36`（en/ArcBlog/UTC）+ 6 个 On/Off + 3 个 Save + 2 个 Create（§3.C-2） |
| ①d | 侧栏 18 项且当前项 `[data-active="true"]` 恰 1 个 | **通过** | 18 个页面行；`activeCount=1`、`activeTexts=["General"]`、`aria-current="page"`（§3.C-2）；全 18 页扫描 `bad=0`（§3.F-1） |
| ①e | 每个开关的影响范围文案在 DOM 可见 | **通过** | Comments/RSS/Agent Access 三块各有 `Impact: …` + 消费方状态段（§3.C-3，原文摘录） |
| ②a | 页面真实提交改字段 → 复读 AFS 确认落库 | **通过** | 六字段**全部**从页面写入并 AFS 复核（§3.D-1…D-4） |
| ②b | 有消费方的开关**即时生效** | **通过** | RSS off → `0 <item>`（channel 保留）；Agent Access off → `check` exit 1、`run` `AGENT_DISABLED` exit 1（§3.D-3/D-4） |
| ②c | 逐个开关标注「有消费方/无消费方（仅记录）」 | **通过（如实标注）** | RSS ✅有消费方、Agent Access ✅有消费方、**Comments ❌无消费方（仅记录）**——页面文案如实写明，QA 用 grep 独立确认仓库无评论消费方（§3.D-5） |
| ③ | guest 上下文 `?page=settings-general`：只见登录卡、无泄漏 | **通过** | 隔离上下文：`inputs:0`、`sidebarRows:0`、正文只有「设置 / 使用 DID Wallet 登录后管理本实例的通用设置。」（§3.E-1） |
| ④ | 从 UI-007 抽 ≥5 条偏差断言，自行复现 computed 值 | **通过（复现 9 条）** | V1/V2/V3/V4/V5/V6/V7/V8/V9 全部由 QA 用自己的探针复现，两侧数值并列（§3.G） |
| ⑤a | BUG-010/011 等价断言不回退 | **通过** | 4 页 × 2 视口：`candidates=1, total=0`；`original` 与 BUG-011 记载一致（§3.H-1） |
| ⑤b | 全部控制台页（含新页）无 `SESSION INIT FAILED` | **通过** | 18/18 页 `failed:false`、`sidebarActiveCount=1`、活动项即本页（§3.F-1） |
| ⑤c | 负面试例 ≥2 条 | **通过（8 条）** | CLI 6 条 fail-closed + 深链 2 条（§4） |

### 2.2 spec §15.9「通用 General」逐条

| 验收标准（spec L1247–L1260） | 结论 | 证据 |
| ---- | ---- | ---- |
| 站点级基础配置有唯一归属地（名称/语言/时区 + 三个 Instance 开关） | **通过（落点降级，见 §7-2）** | 一页 `?page=settings-general` 承载六字段；记录落点 `config/{general,switches}`（§3.D） |
| 「这个开关在哪」的答案只有这里 | **通过** | 侧栏新增 `Settings` 组 + `General` 行；页面 `desc` 与 `scope-desc` 明写路径与范围（§3.C-3） |
| 开关变更**即时生效** | **通过（有消费方的两个）** | RSS/Agent Access 页面写入后立即影响 CLI 输出（§3.D-3/D-4）；Comments 无消费方，页面如实标注（不判失败，§3.D-5） |
| 影响范围在界面上写清楚 | **通过** | 每个开关一组 `name + Impact + 消费方状态`（§3.C-3） |

---

## 3. 执行的原始命令与结果摘录

### A. 快层门（QA 自跑）

```text
$ arc dsl validate --json | tail
  "issues": []
$ npm test | tail
ℹ tests 28
ℹ suites 0
ℹ pass 28
ℹ fail 0
ℹ duration_ms 919.702291
fast tier passed — this is the gate.

$ node scripts/arcblog-console-nav.mjs --check
{ "ok": true, "action": "check", "pages": 18 }
$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change
```

### B. 定向 live（`.gate-lock` 持有期间串行单跑；**未跑全量 live**）

```text
$ npm run test:file -- scripts/arcblog-settings.test.mjs
✔ show reports the three appearance settings with their surfaces
✔ set rejects a value outside the record's options and leaves it untouched
✔ live: a CLI write changes what a signed-out reader (and the bridge) sees, then restores
ℹ tests 3  pass 3  fail 0   duration_ms 6718

$ npm run test:file -- scripts/arcblog-rss.test.mjs
✔ rss outputs xml with channel
✔ rss includes published post when available
ℹ tests 2  pass 2  fail 0   duration_ms 6512

$ npm run test:file -- scripts/arcblog-agent.test.mjs
✔ run refuses closed and unavailable tools with distinct codes
✔ run requires a grant before a write tool, and agent.admin cannot be granted
✔ live: read tools answer from AFS and a granted write tool runs
✔ get_analytics aggregates public surfaces only (spec §60/§62)
ℹ tests 21  pass 21  fail 0   duration_ms 31890
```

> **覆盖缺口（观察，非缺陷）**：新增的 `general install|show|set` 与两个消费方开关**没有任何自动化用例**（`grep -n "general" scripts/arcblog-settings.test.mjs` 无命中；rss 测试无 language/timezone；agent 测试无 `agent-access`）。本轮按任务书「不改 `npm test` 28/28 基线」办理，改由 QA 定向人工验证（本 §C/§D）。建议 PM 决定是否下轮补 `scripts/arcblog-settings.test.mjs` 的 general 用例。

### C. 页面渲染 / 命名降级（CDP，admin 默认上下文）

**C-1 `?page=settings`（字面断言的路径）→ 静默回落公开首页**

```json
{"url":"http://arcblog.localhost:4939/","hasFail":false,"hasGeneralTitle":false,
 "hasSettingsRecord":false,"h2":["Latest published"],"active":[]}
```

**C-2 `?page=settings-general`（真实页）**

```json
{"hasFail":false,"title":"ArcBlog","url":"http://arcblog.localhost:4939/?page=settings-general",
 "bodyHead":"ArcBlog ▾ Content Dashboard Studio Pages Write Site Heroes … Economy Policy Access Factory Settings General …"}
{"actionCount":31,"pageRowLabels":["Dashboard","Studio","Pages","Write","Heroes","Categories","Tags","SEO","Feeds",
  "Appearance","Operations","Hub console","Media","Agents","Policy","Access","Factory","General"],
 "activeCount":1,"activeTexts":["General"],"activeTag":["BUTTON.aup-action"],"ariaCurrent":["page:General"]}
{"inputs":[{"type":"text","name":"eValue","value":"en","w":698,"h":36,"visible":true},
           {"type":"text","name":"eValue","value":"ArcBlog","w":698,"h":36,"visible":true},
           {"type":"text","name":"eValue","value":"UTC","w":698,"h":36,"visible":true},
           … 6 × input[name=ePath]/[name=sPath] hidden …],
 "buttons":[Save×3, On×3, Off×3, Create basics, Create switches], "counts":{"inputs":9,"buttons":11}}
```

**C-3 三个开关的「影响范围 + 消费方状态」原文（DOM 可见）**

```text
Comments         | Impact: none today. Planned to gate a comment surface if one is built (spec §15.9).
                 | No consumer yet — ArcBlog has no comment feature at all, so this switch is recorded only.
                   It is not a fake control: the page says so, and the record is readable by the CLI.
RSS              | Impact: the public RSS feed (and therefore every subscriber). It does not remove published posts.
                 | Consumed by scripts/arcblog-rss.mjs: when off, the generated feed keeps its channel but carries
                   no <item>. Takes effect on the next feed generation.
Agent Access     | Impact: every Agent Access tool call on this node. It does not affect the read-only public web surface.
                 | Consumed by scripts/arcblog-agent.mjs: when off, `run` refuses every tool and `check` reports the
                   switch as disabled (fail closed). Takes effect on the next CLI run.
```

**C-4 i18n（en/zh 双语渲染，无裸 key）**

```json
{"lang":"en","rawKeys":[],"rawT":false,"sample":["Instance-level General settings: site name, language, timezone and the three Instance switches…","What belongs here","Site basics","Instance switches"]}
{"lang":"zh","rawKeys":[],"rawT":false,"sample":["Instance 级通用设置：站点名称、语言、时区，以及三个 Instance 开关。「这个开关在哪」的答案只有一个地方。","归属与范围","基础信息","Instance 开关"]}
```

**已知 i18n 边界（如实登记，不判失败）**：记录自带的 `label`/`description`/`options` 是 AFS 元数据，在 zh 页面仍显示英文（`Language` / `Site name` / `Timezone` / `Allowed values: ["en","zh"]`）。与 Dev 自述一致；根因是 arc-contracts §28.8（`$t()` 的 key 必须是编译期常量，无法按记录值切换）。`output.get("zh")` 全文 60 行已留存于 `/tmp`，页面自有文案（含三个开关的影响范围、按钮、状态标签）**全部已本地化**。

### D. 写入闭环（页面真实点击 → AFS 复核 → 消费方即时生效）

**D-1 六条记录由 CLI seed 后的页面写入（推翻 Dev 自述的「CLI 创建的记录从页面不可写」）**

```text
$ node scripts/arcblog-settings.mjs general install     # 六条均由 CLI（writeJson）写入
created 0 kept 6
# 浏览器 ?page=settings-general：3 个基础项逐个改值 + Save；3 个开关逐个 On/Off
# ① site-name = "QA11 Probe Site" → Save
$ arc afs exec … read …/config/general/site-name.json
{"label":"Site name","description":"Channel title of the generated RSS feed. …","scope":"instance",
 "type":"text","value":"QA11 Probe Site"}            updatedAt: 2026-09-28T01:19:56.808Z
# ② 三个开关点击后（AFS 真 boolean，不是字符串 "false"）
rss          value=False type=bool keys=['description','label','scope','type','value']
agent-access value=False type=bool keys=['description','label','scope','type','value']
comments     value=True  type=bool keys=['description','label','scope','type','value']
# ③ language/timezone 用同一个 input 通道写回并复核（见 D-2 的复位）
```

⇒ arc-contracts §29.2 的 R10 更正口径成立；Dev 建议 QA 复核的「CLI 创建记录只读」**未复现**（→ BUG-022：页面文案正是基于该过时口径写的）。

**D-2 页面复位（六个字段全部经页面写入过至少一次，元数据 tree-merge 保型）**

```text
restoreBasicsViaPage: {"site-name.json":"saved ArcBlog","language.json":"saved en","timezone.json":"saved UTC"}
restoreSwitchesViaPage: {"rss.json":"clicked On","agent-access.json":"clicked On","comments.json":"clicked Off"}
$ arc afs exec … read（六条）
general/site-name   value='ArcBlog' type=str  fields=['description','label','scope','type','value']
general/language    value='en'      type=str  fields=['description','label','options','scope','type','value']
general/timezone    value='UTC'     type=str  fields=['description','label','options','scope','type','value']
switches/comments   value=False     type=bool
switches/rss        value=True      type=bool
switches/agent-access value=True    type=bool
```

**D-3 RSS 消费方（`site-name` / `language` / `timezone` / `rss` 开关）**

```text
# CLI 写入 site-name=QA Probe Site / language=zh / timezone=Asia/Shanghai 后
$ node scripts/arcblog-rss.mjs --feed-link https://example.com | grep -E "<title>|<language>|<lastBuildDate>"
    <title>QA Probe Site</title>
    <language>zh</language>
    <lastBuildDate>Mon, 28 Sep 2026 09:17:53 +0800      ← IANA 偏移生效（UTC 基线为 +0000）
$ items before rss off: 3
$ node scripts/arcblog-settings.mjs general set --rss off
$ items after  rss off: 0                                 ← 开关即时生效，channel/lastBuildDate 仍在
```

**D-4 Agent Access 消费方**

```text
$ node scripts/arcblog-agent.mjs check     (on)  → {"ok":true,"failed":[],"agentAccess":"on"}   [exit 0]
$ node scripts/arcblog-settings.mjs general set --agent-access off
$ node scripts/arcblog-agent.mjs check     (off) → {"ok":false,"failed":["agent-access-switch"],"agentAccess":"off"}   [exit 1]
$ node scripts/arcblog-agent.mjs run --tool search_posts --query x   [exit 1]
{"ok":false,"code":"AGENT_DISABLED","error":"Agent Access is switched off for this instance (Settings → General, spec §15.9). …"}
```

**页面写入路径同样触发这两个消费方**（不是只有 CLI 写入才生效）：页面点击 rss Off / agent-access Off 后，同两条命令分别得到 `item count: 0` 与 `exit 1 + AGENT_DISABLED`。

**D-5 Comments 开关：无消费方（如实登记，不判通过/失败）**

```text
$ grep -rn "comments" scripts/*.mjs scripts/lib/*.mjs world/*.yaml  | grep -v "comments-surface"
scripts/lib/general-settings.mjs:94  comments: {   ← 只有字段声明自身
scripts/arcblog-settings.mjs:…       ← 只有 help/注释
$ grep -rn "comments-surface" .aup/ pages/ .web/
.web/themes/default/THEME.md:64  （仅文档提及，无实现）
```

⇒ 页面/记录/CLI 三处都如实标注「仅记录、无消费方」，**未造假联动**；spec §121 把评论列为 V2+，本轮保留与否属产品裁决（§7-5）。

### E. guest 隔离上下文（无 cookie）

```text
# ?page=settings-general（隔离上下文，默认 zh）
{"hasFail":false,"h2":["设置"],"inputs":0,"switchCopyVisible":false,
 "sidebarRows":0,"navText":false,
 "body":"ArcBlog\n设置\n使用 DID Wallet 登录后管理本实例的通用设置。\n使用 DID Wallet 登录"}
```

⇒ 只见登录卡，**无字段/开关/侧栏泄漏**；与 `scripts/arcblog-permissions.test.mjs` 的 guest 权限矩阵（`npm test` 内）一致。

### F. 全 18 页扫描（admin，1803×908，单进程顺序导航）

**F-1 逐页**

```text
$ node /tmp/qa11-scan-pages.mjs
{"page":"dashboard","failed":false,"sidebarActiveCount":1,"sidebarActiveText":["Dashboard"],"sidebarActiveAria":["page"]}
{"page":"posts","failed":false,"sidebarActiveCount":1,"sidebarActiveText":["Studio"]}
{"page":"pages",…"Pages"}  {"page":"compose",…"Write"}  {"page":"heroes",…"Heroes"}
{"page":"categories",…"Categories"}  {"page":"tags",…"Tags"}  {"page":"seo",…"SEO"}
{"page":"feeds",…"Feeds"}  {"page":"appearance",…"Appearance"}  {"page":"operations",…"Operations"}
{"page":"hub",…"Hub console"}  {"page":"media",…"Media"}  {"page":"agents",…"Agents"}
{"page":"policy",…"Policy"}  {"page":"access",…"Access"}  {"page":"factory",…"Factory"}
{"page":"settings-general","failed":false,"sidebarActiveCount":1,"sidebarActiveText":["General"],"h2":["General"],"bodyLen":2726}
{"summary":{"pages":18,"bad":0}}
```

**F-2 新页的样式合规（做对的部分）**

```json
{"cardCount":4,"cardPad":["14px"],"cardGap":["10px"],"cardRadius":["10px"],"cardShadow":["none"],"cardMargin":["0px"],
 "pageTitle":{"t":"General","fs":"17px"},"colGap":"10px","btnRadius":["4px","999px","0px","8px"],
 "primaryVisible":6,"primaryInView":3,"h3CountBySize":{"15px":4,"17px":6,"12px":3}}
```

⇒ 卡片 §3.3（14px / gap 10px / radius 10px / shadow none）、内容列 `rowGap` 10px、按钮圆角 8px、页面标题 17px **全部达标**；两处不达标见 BUG-024（标题字号）与 BUG-025（primary 数量）。

### G. UI-007 偏差的独立复现（QA 自己的探针，两侧数值并列）

| UI-007 条目 | UI-007 声明 | QA 本轮实测（自跑） | 判定 |
| ---- | ---- | ---- | ---- |
| **V1** gate 登录 CTA 被拉伸到整卡宽 | 1094px（17/17 页） | guest `settings-general` @1803×908：CTA `w=1094, h=38`，卡 `1136` → **96% 卡宽**；guest `compose` 同值 1094 | **复现** |
| **V2** gate 说明句 `intent=info` 对比度 < AA | 4.49:1 | guest `settings-general`：文案色 `rgb(37,99,235)`（`--color-info`）on 卡底 `rgb(240,239,236)`（`--card-bg`）→ QA 计算 **4.49:1** | **复现（数值完全一致）** |
| **V3** destructive 按钮文字对比度 | 3.99:1（posts 34/hub 4/factory 6） | factory：`rgb(197,48,48)` on `color(srgb .77 .19 .19 / .12)`；QA 合成底后 **4.14:1**（posts 35 个、factory 6 个）→ **同向、均破 4.5** | **复现（方法差 → 数值 4.14 vs 3.99，差异来自合成底基准；结论一致）** |
| **V4** compose 内容列 gap 20px 应 10px | 20px | compose `colGap=20px`（对照 posts/dashboard = 10px） | **复现** |
| **V5** factory 内容列 gap 20px | 20px | factory `colGap=20px` | **复现** |
| **V6** compose 两个按钮圆角 32px 应 8px | 32px | compose `btnRadius=["4px","999px","0px","32px"]`；factory 为 `[...,"8px"]` | **复现** |
| **V7** factory 页面标题 21.6px 应 17px | 21.6px | factory `pageTitle.fs=21.6px`（compose/dashboard/posts = 17px） | **复现** |
| **V8** 18 节后侧栏溢出、页脚落到折叠线下 | 56px(en)/86px(zh) | @1803×908：en `scrollH 916 - clientH 860 = 56`、zh `946-860 = 86`；`footerBottom 963.5/993.5 > 908` → `footerBelowFold:true` | **复现（数值完全一致）** |
| **V9** 12 处 h3 用运行期默认 17px 应 15px | compose 4/agents 4/categories 3/dashboard 1 | QA：compose `{17px:4}`、agents `{17px:4,15px:3}`、categories `{17px:3}`、dashboard（不滤可见）`{17px:1,15px:3}` = **12 处** | **复现（逐页分布一致）** |

**结论**：UI-007 的偏差断言与「可接受平台差异」标注在本轮快照下**全部可独立复现**，无夸报；其中 V3 的绝对对比度因合成底基准不同有 ±0.15 差异（QA 已标注方法）。此外 QA 在**新页 `settings-general`** 上发现同类问题（UI-007 扫描范围未含该页）→ BUG-024（6×17px + 3×12px）、BUG-025（3 primary/屏）。

**平台差异抽样复核（UI-007 §3，标注有据）**：`?page=appearance` 的 `auto-surface` 卡片 padding 由平台决定（本页 `cardCount` 与标准卡不同源）；平台 `.aup-copy-btn` 18×18/3px 仍为英文 title；页面根 `scrollWidth==clientWidth`（1803/1803，无横向滚动）；`?locale=` 同 tab 连续切换不可靠 → QA 的 en/zh 对照**分两个 target** 采集（与 UI-007 §3.6 方法限制一致，未做逐页双语全量对照）。

### H. 回归

**H-1 BUG-010/011 等价断言（`docs/ArcBlog-admin-ui-design.md` §9 原文块，逐字节执行）**

```text
页面            视口      original   candidates  total   linksPerColumn
compose         1803x908     0           1        0       [0]
compose         1512x765     0           1        0       [0]
appearance      1803x908     1           1        0       [0]
appearance      1512x765     1           1        0       [0]
posts           1803x908     0           1        0       [0]
posts           1512x765     0           1        0       [0]
settings-general 1803x908    0           1        0       [0]
settings-general 1512x765    0           1        0       [0]
```

- **等价断言**（candidates≥1 且 total=0）：8/8 通过，**含新页**；compose 两视口 `candidates=1`（BUG-010 的修复未被本轮回退）。
- **原断言**（`.pop()`）：compose/posts/新页两视口均 `0`；`appearance` 两视口均 `1` —— 与 BUG-011 记载的「appearance 上重演」一致；且因侧栏现在是 18 节（1803×908 下也溢出），该 `1` 在**两个视口都出现**（不再是视口敏感的空心通过，而是稳定误命中侧栏容器）。**属既有 BUG-011 现象，本轮未新增/未恶化**。
- `BUG-010` 的原始现象（滚壳 = 顶栏/侧栏滚走）在本轮快照下：3 页 `headerMoved:false`、`windowScrollable:false`；compose 已有独立内容列滚动容器 `DIV 1471×744 / sh1536`（posts `1471×749/sh3022`、新页 `1471×759/sh1439`）→ **无回退**。

**H-2 消费方回归**（本轮接线改动后）

```text
$ node scripts/arcblog-rss.mjs --feed-link https://example.com   → <title>ArcBlog</title> / <language>en</language> / <lastBuildDate>…+0000</lastBuildDate> / items=3
$ node scripts/arcblog-agent.mjs check                            → exit 0
$ node scripts/arcblog-settings.mjs show                           → 三个外观记录仍在（tone/palette/theme），语义未变
```

---

## 4. 负面用例（8 条，全部 fail-closed 或有可解释回落）

| # | 输入 | 期望 | 实际（原始输出） | 结论 |
| -- | ---- | ---- | ---- | ---- |
| N1 | `general set --language fr` | 拒绝、记录不变 | `{"ok":false,"code":"VALIDATION","error":"language must be one of: en, zh (got \"fr\")"}` [exit 1] | ✅ |
| N2 | `general set --timezone Mars/Olympus` | 拒绝 | `{"code":"VALIDATION","error":"timezone must be one of: UTC, Asia/Shanghai, … (got \"Mars/Olympus\")"}` [exit 1] | ✅ |
| N3 | `general set`（无 flag） | 拒绝 | `{"code":"VALIDATION","error":"nothing to set (use --site-name/--language/--timezone/--comments/--rss/--agent-access)"}` [exit 1] | ✅ |
| N4 | `general set --rss maybe` | 拒绝（toggle 归一化） | `{"code":"VALIDATION","error":"rss must be on or off (got \"maybe\")"}` [exit 1] | ✅ |
| N5 | `general bogus` | 拒绝 | `{"code":"VALIDATION","error":"unknown general command: bogus (use install\|show\|set)"}` [exit 1] | ✅ |
| N6 | 记录缺失时 `general set` | 拒绝、不发明字段 | 删 `language.json` 后：`{"code":"NOT_FOUND","error":"/instance/app/arcblog/config/general/language.json is missing — run: node scripts/arcblog-settings.mjs general install"}` [exit 1]；`general install` 逐条恢复 `created ['language'] kept 5` | ✅ |
| N7 | guest `?page=settings-general` | 只见登录卡 | `inputs:0, sidebarRows:0`，正文仅 gate 文案 | ✅ |
| N8 | 不存在的页名 `?page=__nonexistent__` | 有可解释行为 | 静默回落公开首页（`url → http://arcblog.localhost:4939/`，无错误、无 SESSION INIT FAILED）；**`?page=settings` 同此** | ⚠️ 回落本身是平台行为；`?page=settings` 是**本轮的命名降级**（§7-1） |
| N9（补充） | `general show --instance no-such-instance` | 明确报错 | `{"code":"RUNTIME_ERROR","error":"ERROR: no instance named \"no-such-instance\". arc service list shows 1"}` [exit 1] | ✅ |

---

## 5. 回归结论

- 快层门：`arc dsl validate --json` `issues: []`；`npm test` **28/28 pass / 0 fail**（919.7ms）；`arc dsl generate --check` **0 漂移**；`console-nav --check` **pages 18**。
- 构建一致性：`.aup/**` / `scripts/**` / `locales` 源码与 `dist` **逐文件 same**。
- 定向 live：settings 3/3、rss 2/2、agent 21/21 全绿（无并发假失败；本轮实例串行，锁全程持有）。
- 浏览器：18/18 控制台页无 `SESSION INIT FAILED`、每页恰 1 个活动项；BUG-010/011 等价断言 8/8 不回退；guest 权限无泄漏。
- **无新增回归失败**。

---

## 6. 新增 BUG 列表（全部 P2，均在新建页面内）

| 编号 | 级别 | 标题 | 影响 | 状态 |
| ---- | ---- | ---- | ---- | ---- |
| [BUG-021](../bugs/BUG-021-settings-gate-login-return-to-missing-page.md) | **P2** | gate 登录 `return_to`/`cancel_to` 指向不存在的 `?page=settings`，登录后落到公开首页 | 未登录运营者登录后丢失目标页（其余 17 页均回本页） | 待裁决（建议本轮修，1 行） |
| [BUG-022](../bugs/BUG-022-settings-init-copy-contradicts-contracts-29-2.md) | **P2** | 「初始化记录」文案与 `arc-contracts.md` §29.2（R10 更正）相反，诱导运营者删记录 | 误导性破坏建议；六条 CLI seed 记录实测页面可写 | 待裁决（建议本轮修文案） |
| [BUG-023](../bugs/BUG-023-settings-page-write-skips-options-validation.md) | **P2** | 基础信息写入绕过记录 `options` 校验（select 渲染成自由文本）→ `language=fr` 落库并被 RSS 输出 | CLI 仍 fail-closed；错误值进入公开订阅直到人工修正 | 待裁决（**QA 认为可争议升级 P1**，见 §7-4） |
| [BUG-024](../bugs/BUG-024-settings-heading-sizes-off-standard.md) | **P2** | 9 处标题字号偏离 §3.4/§2.6（6×17px 行标题、3×12px 开关名，应 15px） | 与 UI-007 V9 同类；仅呈现 | 待裁决（建议本轮修） |
| [BUG-025](../bugs/BUG-025-settings-page-multiple-primary-buttons-per-screen.md) | **P2** | 同屏 3 个 `primary`（全页 6 个），违反 §4.3「每屏一个 primary」 | 视觉层级；仅呈现 | 待裁决（建议本轮修） |

**未开 BUG 的既有项（避免与 UI-007 重复，QA 已独立复现）**：V8 侧栏 18 节溢出 56px(en)/86px(zh)、页脚落到折叠线下（UI-007 §2-V8 已报，本轮由「新增第 18 节」直接引入）；V3 destructive 对比度 3.99→QA 4.14、V4/V5/V6/V7/V9（UI-007 §9 待派活清单）。以上均**不是本轮新增代码的回归**，交由 PM 在 V1–V9 批次里一并裁决。

---

## 7. 受限未验证项 + 需裁决观察

1. **命名降级：`?page=settings` → `?page=settings-general`（需 Lead/PM 接受）**
   - 实测证据（QA 独立复现 Dev 的探针）：`page settings { … }` 单独校验即报 `invalid_settings_dsl`：
     ```text
     $ arc dsl validate /tmp/qa-aup-probe/settings.aup --json
     {"severity":"error","code":"invalid_settings_dsl","line":1,"column":1,
      "message":"1:1 Expected settings [id] {","sourceLine":"page settings {"}
     $ arc dsl validate /tmp/qa-aup-probe/settings-general.aup --json   → {"ok":true,"issues":[]}
     ```
     ⇒ 文件名/页名 `settings` 在本语言下不可用，改名不是工程选择而是语言限制。副作用有两条：`?page=settings` 静默回落公开首页（§4-N8）；新页 gate 的返回地址也因此错（**BUG-021，可且应当修**）。
   - **QA 判定**：作为「命名降级」记录在案、**不阻断**（无可行替代），但需 Lead/PM 明确接受并把 REQ/spec 里的 `?page=settings` 口径改为 `settings-general`（否则字面验收标准永远不成立）。
2. **记录落点降级：`/instance/app/arcblog/config/{general,switches}/<field>.json`（需 Lead/PM 接受/是否补 seed）**
   - QA 验证的是**可观察事实**：页面读写、元数据保型、CLI 读写、消费方接线全部成立；记录形状与平台设置记录一致（`label/description/scope/type/options/value`）。权限仍是 admin-only（`blocklet.yaml` `replicated.config`，guest 实测无泄漏）。
   - **未验证**：Dev 关于「平台 `/instance/settings/arcblog/` 是 seed 驱动闭集、auto-surface 渲染 No settings」的探针结论本身（§0-4）。若 PM 要求与平台设置面统一，需 Dev 补 `seed/settings/arcblog/**` 并重跑 `arc blocklet build`（本任务写范围之外）。
3. **「跨 `arc service restart` 仍可写」未独立验证**（QA 未重启共享 daemon）。已证的替代事实：CLI seed 的六条记录当场页面可写；重启后的行为属 Dev 探针结论，**不当作 QA 已验证**。
4. **BUG-023 的等级存疑（唯一一条 QA 认为可争议的）**：QA 判 P2（页面自由文本写入、CLI 侧仍 fail-closed、可恢复）；若 Lead/PM 认为「记录的 `options` 契约对页面写入同样有约束力、且公开 RSS 不得出现选项外值」属 P1，则该条应升级并可能与 BUG-021 一起成为本轮**不放行**的理由。**QA 的放行结论按 P2 给出，请 Lead 明确是否认可该分级。**
5. **Comments 开关的保留/移除**：如实登记——**无任何消费方**（§3.D-5 grep 证据），页面/记录/CLI 均标注「仅记录」；spec §121 列表评论为 V2+。属产品裁决，不影响本轮技术结论。
6. **自动化覆盖缺口**：新增 `general install|show|set` 与两个消费方开关无单测（§3.B 注释）；建议 PM 下轮补 `scripts/arcblog-settings.test.mjs` 用例（新文件属 live 层，需先做 `FAST_TESTS` 决策）。
7. **`.aup/man/settings.yaml` 是过期脚手架存根**（`page: settings`，引用不存在的 action id `arcblog-settings-card-1-action-3`）；`.aup/man/**` 不在 Dev 写范围，Dev 已上报。**QA 同样未改**——建议 Lead 删除或改名为 `settings-general`（P3 观察，未开 BUG）。
8. **实例既有残渣（非本轮引入）**：`config/` 下有 128 条历史测试目录/记录（`chain-intents-worker-*`、`mock-worker-*`、`nft-factories-test-*`、`roles-test-*` 等，时间戳均为 2026-09-27）。QA 只动了 `config/{general,switches}` 下六条记录，未新增任何探针记录（§8）。是否清理由 Lead 决定。

---

## 8. 实例清理自证

```text
# 写锁（任何写实例动作之前落盘，跑完删除）
$ cat docs/team/.gate-lock
owner=qa-round11 (independent verification)
start=2026-09-28 09:16:43
scope=targeted live: arcblog-settings/arcblog-rss/arcblog-agent + instance writes (browser write closure)
$ rm docs/team/.gate-lock && ls docs/team/.gate-lock
ls: docs/team/.gate-lock: No such file or directory          ← 锁已释放

# 探针清理：本轮的写动作只落在六条既有记录上（无新探针路径）
$ arc afs exec … list /instance/app/arcblog/config/general   → ['language.json','site-name.json','timezone.json']
$ arc afs exec … list /instance/app/arcblog/config/switches  → ['agent-access.json','comments.json','rss.json']
$ arc afs exec … list /instance/app/arcblog/config | grep -iE 'probe|qa|tmp'   →（无）
$ ls .aup/pages/*/ | grep -iE 'probe|tmp|qa'                 →（无）

# 设置值复位为默认（六个字段，页面复位 + AFS 复核）
$ node scripts/arcblog-settings.mjs general show
{'site-name': ('ArcBlog','text'), 'language': ('en','select'), 'timezone': ('UTC','select'),
 'comments': (False,'toggle'), 'rss': (True,'toggle'), 'agent-access': (True,'toggle')}

# 消费方回到基线
$ node scripts/arcblog-rss.mjs --feed-link https://example.com | grep -c "<item>"   → 3
$ node scripts/arcblog-agent.mjs check                                              → exit 0
```

**须披露的一处副作用**：为测试「记录缺失时 `general set` 应 fail-closed」的负例，QA 用 `/.actions/delete` 删过 `config/general/language.json` 并立即用 `general install` 重建；**值/类型/元数据字段与删前逐字段一致**，仅 `createdAt` 变为本轮时间（删除-重建的必然结果）。其余五条记录未删。

**验证工具**（全部在 `/tmp`，未入库）：`/tmp/qa11-cdp.mjs`（CDP runner：admin/guest 上下文、视口、多步 eval）、`/tmp/qa11-scan-pages.mjs`（18 页扫描）、`/tmp/qa11-probe-deviations2.js`、`/tmp/qa11-probe-ui9.js`、`/tmp/qa11-probe-newpage.js`、`/tmp/qa11-probe-primary.js`、`/tmp/qa11-probe-neg.js`、`/tmp/qa11-probe-i18n.js` 及对应 `-spec-*.json`。

---

## 9. 放行结论

**放行（Pass）。**

- 门槛逐条：门 4/4 全绿（原始输出已摘录）✔；REQ/spec §15.9 每条验收标准都有明确结论、无「未测」遗漏 ✔；负面用例 9 条 ✔；波及回归（3 个定向 live + 18 页浏览器 + BUG-010/011 等价断言）无新增失败 ✔；**无 P0、无未裁决 P1**（5 条 P2，全部在新建页面内，可放行入 backlog）✔；报告落盘 ✔。
- **需 Lead 两句话收口**：① 接受 `settings-general` 命名降级 + `config/{general,switches}` 记录落点（§7-1/§7-2）；② 认可 BUG-023 的 P2 分级（若判 P1，则本轮改为不放行，阻断项即 BUG-021 + BUG-023）。
- **建议 PM 裁决**：BUG-021/022/024/025 本轮修（合计约 5 行 + 3 个字号 + 文案）；BUG-023 随受控控件一起修；Comments 开关保留/移除。

`VERDICT=pass, BLOCKING=0`
