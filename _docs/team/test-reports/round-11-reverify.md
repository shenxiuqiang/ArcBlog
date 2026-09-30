# round-11-reverify 测试报告（R11F 修复窗口：BUG-021…025 复验 + UI-007 机械偏差抽查 + 回归）

> **角色**：QA（独立验证者）｜**轮次** Round 11F（修复窗口复验，2026-09-28）｜**任务**：Lead 裁定 D20/D21–D27 后的独立复验
> **写范围**：本文件 + `docs/team/bugs/**` + `docs/team/.gate-lock`（临时）。**未改任何源码 / 测试 / `.aup` / `dist` / 规格文档。**
> **被测快照**：工作区 HEAD `17aac1f` + 本轮未提交改动。`dist/**` 最后一次 `arc blocklet build` = **09:57:48**；`.aup/man` 改名发生在 **09:59:41**（构建之后）→ 见 §7 阻断项。
> **方法**：不采信 Dev/UI 自述。所有结论来自本轮 QA 自己执行的命令与 CDP 实测。**未跑全量 `npm run test:live`**（用户裁定 + 本轮任务书禁止）。
> **一、结论（一句话）**：**不放行（fail, BLOCKING=1）**。BUG-021/022/023/024/025 **五条全部功能闭环**（BUG-023 的 P1 两侧都挡：页面受控 + 读取侧 fail-closed），UI-007 的 V1/V2/V4/V5/V6/V7/V9 机械偏差**全部修复**，快层门 4/4 全绿、定向 live 26/26 全绿、18 页回归无失败；**唯一阻断项是构建一致性**：`.aup/man/settings.yaml → general.yaml` 的改名发生在最后一次 `arc blocklet build` 之后，**`dist/.aup/man/` 尚未重建**（`diff -r .aup dist/.aup` 当前非 SAME）→ 见 [BUG-027](../bugs/BUG-027-dist-stale-after-man-rename.md)。另发现 1 条同类既有 P2（compose-edit gate 指向不存在的 `?page=admin` → [BUG-026](../bugs/BUG-026-compose-edit-gate-return-to-missing-page.md)）。

---

## 0. 验证方式与边界

- **独立复跑门**：`arc dsl validate --json`、`npm test`、`arc dsl generate --check`、`node scripts/arcblog-console-nav.mjs --check`、`diff -rq scripts dist/scripts`、`diff -r .aup dist/.aup`、硬编码颜色 grep —— 全部 QA 自跑（§3）。
- **定向 live（串行）**：`.gate-lock` 落盘（`owner=qa-round11-reverify`）→ 单跑 `arcblog-settings` / `arcblog-rss` / `arcblog-agent` 三个受影响文件 → 删锁（§8）。**未跑全量 `npm run test:live`**。
- **浏览器**：共享调试 Chrome CDP `http://127.0.0.1:9333`；admin = 默认上下文（有登录态），guest = `Target.createBrowserContext` 隔离上下文（无 cookie）。临时脚本全部在 `/tmp/qa11r-*`，未入库。
- **写入类断言一律以 AFS 记录为准**（`arc afs exec /blocklets/arcblog/.actions/read`），不看 toast。
- **复验项**：① BUG-023（首项，P1）② BUG-021 ③ BUG-022 ④ BUG-024/025/V2 ⑤ UI-007 机械偏差抽查 ⑥ 回归 + 快层门。

**受限未验证（不当成通过）**

1. **真实 DID Wallet 登录回跳**：无钱包，只能证明 gate 的 `return_to` 指向**真实存在且可渲染**的页 id（§2②）。
2. **一次真实写入失败触发 `onErrorToast`**：未无损诱发平台拒绝；只静态确认 `onErrorToast` 已接线（`.aup/pages/admin/general.aup:161/170/179/223`）并读到错误文案 i18n 键 `general.basics-error`。
3. **深色模式 / 非 admin 已登录会话 / zh 管理端最终构建的逐页复核**：未做（与前轮同）。
4. **平台限制（如实登记）**：`propBind` 在全新标签页首屏不解析（同标签 reload 后正常）——QA 独立复现（§2①a），与 `arc-contracts.md` §21.11 一致；页面已用「占位项 + `required` + 只读 Stored records」兜住，**未绕过**。

---

## 1. 逐条复验结论表

| # | 复验项 | 结论 | 证据 |
| -- | ---- | ---- | ---- |
| ①a | 页面把 `language` 设成选项外值 `fr` → **被拒** | **通过** | 控件已是受控 `SELECT`（options `["","en","zh"]`）；`s.value='fr'` → 回弹为 `""`；真实鼠标点击 Save（1726.4,575.0）→ 无成功 toast、三个控件 `:invalid`（原生提示「请在列表中选择一项。」）、**AFS 未改写**（`updatedAt` 前后同为 `2026-09-28T02:01:40.780Z`）（§3.①a） |
| ①b | 设合法值 `zh` → 可写入且即时生效 | **通过** | 页内 reload 后 select 预填 `en/UTC` 且 valid；设 `zh` + Save → AFS `value:"zh"`（`updatedAt 02:01:02.839Z`）→ 立即 `node scripts/arcblog-rss.mjs` 输出 `<language>zh</language>`（§3.①b） |
| ①c | 服务端/渲染侧对选项外值 fail-closed（Dev 自述的读取侧修复） | **通过（带外写入实证）** | 带外写入 `fr` 落库后：RSS stdout `<language>en</language>`（不回显 `fr`）、stderr 打 WARN、stdout 保持纯 XML；`general show` 报 `issues[]` 且**其余 5 字段 effective 不受影响**；复位后 `issues` 回到 `[]`（§3.①c） |
| ② | gate 的 `return_to/cancel_to` 指向**真实存在**的页 id；深链 active=1 且不是公开首页 | **通过** | `general.aup:54` = `%2F%3Fpage%3Dgeneral`；admin 深链 `?page=general` → url 不回退、`h2=["General"]`、`sidebarActiveCount=1`、`activeText=["General"]`（§3.②）。旧 id `?page=settings-general` / `?page=settings` 均静默回落公开首页（平台行为，无 SESSION INIT FAILED）——**已登记**；另发现 `compose-edit` 的 gate 仍指向不存在的 `?page=admin` → BUG-026（既有，非本轮回归） |
| ③ | 设置页文案不再与 `arc-contracts §29.2` 相反、不再诱导删记录 | **通过** | DOM 原文（en，§3.③）：`init-desc` 现写「…not refused in general; it depends on the origin of the record, the write mode and the daemon process. If a Save ever fails, **probe before deleting anything: delete + recreate loses createdAt**」；zh 对称。旧诱导句（`only edit records it created` / `delete that record with the CLI and create it here` / 中文对应句）在 `.aup/`、`dist/.aup/`、`requirements/` **grep 0 命中** |
| ④a | 设置页 `h3` 字号 = 15px | **通过** | `?page=general`：`h3Count=17, h3BySize={"15px":17}, h3NotBody=[]`（修复前 13 个里 9 个偏离）（§3.④） |
| ④b | 设置页同屏 `primary` = 1（≤1） | **通过** | `primaryOnPage=0, primaryInView=0`（6 个 primary → 0；所有行内动作改 `secondary`）（§3.④） |
| ④c | gate 说明句对比度 ≥ 4.5:1 | **通过** | guest `?page=general`（zh）：文案 `rgb(107,107,120)`（`intent=muted`）on 卡底 `rgb(240,239,236)` → **4.566:1**（修复前 `intent=info` 4.49:1）（§3.④） |
| ⑤ | UI-007 机械偏差抽查 V1/V4/V5/V6/V7/V9 | **通过（逐条）** | V1 CTA 4 页均为 `w=175.4 / parentW=1094`（16%，修复前 1094=100%）；V4/V5 compose+factory 内容列 `rowGap=10px`；V6 compose `Save draft`/`Publish` = 8px（无 32px）；V7 factory `h2` = 17px；V9 8 页 h3 全 15px（§3.⑤） |
| ⑥a | 全部控制台页无 `SESSION INIT FAILED` 且每页 active 恰 1 | **通过** | 18/18 页 `failed:false`、`sidebarActiveCount:1`、活动项=本页，`summary {pages:18, bad:0}`（§3.⑥） |
| ⑥b | BUG-010/011 等价断言不回退 | **通过** | 4 页 × 2 视口：`candidates=1, total=0, linksPerColumn=[0]` 8/8；`original`：compose 0/0、posts 0/0、general 0/0、appearance 1/1（两视口一致，与 BUG-011 记载同形，未恶化）（§3.⑥） |
| ⑥c | 快层门全绿（validate / npm test / console-nav / generate --check / 无硬编码颜色） | **通过** | `issues: []`；`tests 28 / pass 28 / fail 0`；`{"ok":true,"pages":18}`；`Would generate 0 file(s)`；颜色 grep 0 命中（§3.⑥） |
| ⑥d | 定向 live（受影响的 3 个文件） | **通过** | settings 3/3、rss 2/2、agent 21/21（共 26/26，串行，全程持锁）（§3.⑥） |
| ⑥e | **`arc blocklet build`（改了 `.aup` 的门）** | **不通过（阻断）** | `diff -r .aup dist/.aup` → `Only in .aup/man: general.yaml` / `Only in dist/.aup/man: settings.yaml`（exit 1）。`.aup/man/*.yaml` 改名发生于 09:59:41，最后一次 build 是 09:57:48 → [BUG-027](../bugs/BUG-027-dist-stale-after-man-rename.md)（§7） |

---

## 2. 逐条复验详情

### ① BUG-023（P1，首项）——**两侧都挡，闭环**

**(a) 页面侧：选项外值被拒 + AFS 未被改写**

全新标签页（`propBind` 未解析，Dev 已登记的平台限制）：

```text
controlsInOrder（?page=general，admin，全新标签页）:
  {h3:"Language"}  {ctl:"SELECT:select-one", value:"", required:true, options:["","en","zh"], prevH3:"Language"}
  {h3:"Timezone"}  {ctl:"SELECT:select-one", value:"", required:true, options:["","UTC","Asia/Shanghai",…], prevH3:"Timezone"}
  {h3:"Site name"} {ctl:"INPUT:text", value:"", required:true, maxLength:120, prevH3:"Site name"}

injectFr: [{before:"", after:"", checkValidity:false}]     ← s.value='fr' 被浏览器拒绝（选项外），回弹 ""
clickLangSave: {selVal:"", selRequired:true, selValid:false, btnTag:"BUTTON", btnText:"Save"}
after: {toasts: []}                                        ← 无「Setting saved.」假成功
```

真实鼠标点击（`Input.dispatchMouseEvent`，docked at `x=1726.44, y=574.96`）：

```text
BEFORE {"selVal":"","selValid":false,"btnText":"Save","x":1726.4375,"y":574.9609375}
AFTER  {"toasts":[],
        "invalid":["INPUT:eValue|请填写此字段。","SELECT:eValue|请在列表中选择一项。","SELECT:eValue|请在列表中选择一项。"]}
BEFORE AFS: {"value":"en","updatedAt":"2026-09-28T02:01:40.780Z"}
AFTER  AFS: {"value":"en","updatedAt":"2026-09-28T02:01:40.780Z"}     ← 记录未被改写
```

⇒ 「页面真实尝试设成选项外值 → 被拒（`:invalid` + 原生校验提示 + 无成功 toast）+ AFS 未被改写」成立。
（说明：拒绝表现为**控件级校验**（UA 原生消息 + 焦点），不是自定义错误 toast；`onErrorToast`（`general.basics-error`「未保存——写入被拒绝，没有任何改动」）只在平台真拒绝时触发，本轮未无损诱发，属受限项。）

**(b) 合法值可写 + 即时生效**

```text
prefillAfterInPageReload → selects: [{value:"en",required:true,valid:true},{value:"UTC",required:true,valid:true}]
setZhAndSave → {set:"zh", clicked:"Connecting..."}
after        → toasts:["Setting saved.…"]
AFS: {"value":"zh","updatedAt":"2026-09-28T02:01:02.839Z"}
$ node scripts/arcblog-rss.mjs --feed-link https://example.com | grep "<language>"
    <language>zh</language>                        ← 页面写入即时进入消费方
```

**(c) 读取侧 fail-closed（Dev 自述的服务端修复，用带外写入独立实测）**

```text
$ arc afs exec /.actions/write --args '{"path":"…/general/language.json","mode":"tree-merge","content":"{\"value\":\"fr\"}"}'
→ stored value = fr
$ node scripts/arcblog-rss.mjs --feed-link https://example.com
    <title>ArcBlog</title>
    <language>en</language>                        ← 不回显选项外值
stderr: arcblog-rss: WARN /instance/app/arcblog/config/general/language.json:
        stored value is outside the record's options (en, zh) — using "en" instead of "fr"
        (see: node scripts/arcblog-settings.mjs general show)     ← stdout 仍是纯 XML
$ node scripts/arcblog-settings.mjs general show
{"ok":true,"issues":[{"key":"language","field":"language","stored":"fr","effective":"en",
  "reason":"stored value is outside the record's options (en, zh)"}], …}
other fields effective: {site-name:ArcBlog, timezone:UTC, comments:false, rss:true, agent-access:true}   ← 不被连带吞掉
# 复位
$ arc afs exec /.actions/write … content '{"value":"en"}' → stored=en；general show issues=[]；RSS <language>en</language>
```

**结论：BUG-023 已修复（P1 闭环）**。页面已无「选项外值可提交」的路径；带外/旧 build 写入由读取侧 fail-closed 兜底并留痕。Dev 自述的「`pattern=` 放 `afs-list` 行模板会假成功」属平台契约线索（不在 QA 写范围，交由 Lead 收录 `docs/arc-contracts.md`）。

### ② BUG-021——gate 指向真实页 id

```text
$ grep -n "return_to" .aup/pages/admin/general.aup
54:  action -> navigate "/.well-known/service/login?return_to=%2F%3Fpage%3Dgeneral&cancel_to=%2F%3Fpage%3Dgeneral" variant=primary label=:login style={borderRadius: "var(--radius-md, 8px)"}

$ grep -rho "return_to=[^\"']*" .aup/pages/ | sed 's/.*page%3D//;s/&.*//' | sort -u
access admin agents appearance categories compose dashboard factory feeds general heroes hub media operations pages policy posts seo tags

admin 深链 ?page=general → {"url":"http://arcblog.localhost:4939/?page=general","hasFail":false,
  "activeCount":1,"activeText":["General"],"h2":["General"]}      ← 不回退公开首页，侧栏 active=1
```

旧 id 行为（登记，非缺陷）：`?page=settings-general` 与 `?page=settings` 都 **静默回落公开首页**（`url=http://arcblog.localhost:4939/`、`active:0`、无 General 内容、无 `SESSION INIT FAILED`）。Dev 的改名意味着「11 轮未提交的临时页名」不再可深链——已按 D21①口径落到 `general`。

**同类既有问题（本轮新开，非回归）**：19 个 gate 卡里 18 个指向本页，**`compose-edit` 指向 `?page=admin`**；运行期 `?page=admin` → 回落公开首页。`git show HEAD:.aup/pages/admin/compose-edit.aup` 里同样是 `page%3Dadmin` → **本轮未改、既有缺陷** → [BUG-026](../bugs/BUG-026-compose-edit-gate-return-to-missing-page.md)（P2）。

**结论：BUG-021 已修复。**

### ③ BUG-022——文案与 `arc-contracts §29.2` 对齐

DOM 原文（en，`?page=general`，admin）：

```text
general.init-desc（en）:
"Create only the records that are missing, with their documented default; an existing record is
 never overwritten (create mode refuses an existing path). These are ordinary records: the CLI and
 this page can both update them afterwards — arc-contracts §29.2 (corrected in Round 10) says a
 browser write to an existing record is not refused in general; it depends on the origin of the
 record, the write mode and the daemon process. If a Save ever fails, probe before deleting
 anything: delete + recreate loses createdAt."

general.init-desc（zh）:
"只为缺失的记录按文档默认值创建；已存在的记录不会被覆盖（create 模式拒绝已存在路径）。这些就是普通记录：
 之后 CLI 与本页都能更新它们——arc-contracts §29.2（Round 10 已更正）说明浏览器写已存在记录并非一律被拒，
 而是与记录来源、写入模式和当时的 daemon 进程相关。若某次保存失败，先探针再决定：删除重建会丢掉 createdAt。"

$ grep -rn "only edit records it created\|delete that record with the CLI\|请用 CLI 删除该记录后再在此处创建" .aup/ dist/.aup/ docs/team/requirements/
(0 命中)
```

⇒ 反向断言已消除；「删除重建会丢 `createdAt`」现在是**警告**而非诱导。另确认 `general.basics-guard` 明确告知「本页无法提交选项外的取值 / 保存前必须显式选择」——与 ①a 实测一致。

**结论：BUG-022 已修复。**

### ④ BUG-024 / BUG-025 / V2

```text
?page=general (admin, 1803×908):
  {"activeCount":1,"activeText":["General"],"h3Count":17,"h3BySize":{"15px":17},"h3NotBody":[],
   "primaryOnPage":0,"primaryInView":0,"pageTitle":{"t":"General","fs":"17px"},
   "btnRadii":{"8px":11,…}}                        ← 9 个偏离字号 → 0；6 个 primary → 0
posts: h3BySize {"15px":41}, primaryInView 1 / OnPage 1
compose: h3BySize {"15px":4},  factory: {"15px":5},  agents: {"15px":7},
categories: {"15px":3},  dashboard: {"15px":4}

guest ?page=general &locale=zh:
  desc {"tag":"DIV","cls":"aup-text","color":"rgb(107, 107, 120)","bg":{"r":240,"g":239,"b":236},
        "contrast":4.566}                          ← intent=muted，≥4.5（修复前 intent=info 4.49）
  cta  {"w":175.4,"h":38,"parentW":1094}
```

**结论：BUG-024 已修复；BUG-025 已修复（每屏 primary = 0 ≤ 1）；V2 已修复（4.566:1，实现侧改 `intent=muted`，未动主题令牌，符合 D22）。**

### ⑤ UI-007 机械偏差抽查

| 条目 | 修复前（UI-007/round-11） | 本轮 QA 实测 | 判定 |
| ---- | ---- | ---- | ---- |
| **V1** gate CTA 被拉伸 | 1094px（=整卡宽） | guest general/compose/factory/posts 均 `w=175.4 / parentW=1094`（16%） | **已修复** |
| **V4** compose 内容列 gap | 20px | 内容列（`overflowY:auto`+`flexGrow:1`，排除顶栏/侧栏/表单控件）`rowGap=10px, columnGap=10px`，1471×744 | **已修复** |
| **V5** factory 内容列 gap | 20px | `rowGap=10px, columnGap=10px`，1471×860 | **已修复** |
| **V6** compose 按钮圆角 | 32px | `Save draft\|8px`、`Publish\|8px`（compose 无 32px） | **已修复** |
| **V7** factory 页面标题 | 21.6px | `h2 "Node NFT" fs=17px` | **已修复** |
| **V9** 12 处 h3 用运行期 17px | 12 处偏离 | posts 41/41、compose 4/4、factory 5/5、agents 7/7、categories 3/3、dashboard 4/4、general 17/17 **全部 15px** | **已修复** |

**范围外观察（非本轮回归，建议 R12）**：`?page=compose-edit` 仍有 `h2 "Edit post" fs=21.6px` 与 `Back to studio` 按钮 `borderRadius=32px`（V6/V7 的修复范围是 compose / factory）。已登记，未计入本轮结论。

### ⑥ 回归

```text
18/18 控制台页（admin，1803×908，单 target 顺序导航）:
  … 每页 {"failed":false,"sidebarActiveCount":1,"sidebarActiveText":[<本页>],"sidebarActiveAria":["page"]}
  {"summary":{"pages":18,"bad":0}}

BUG-010/011 等价断言（§9 原文表达式，逐字节执行）4 页 × 2 视口:
  compose  1803×908 {candidates:1,total:0,original:0}   compose  1512×765 {candidates:1,total:0,original:0}
  appearance 1803×908 {candidates:1,total:0,original:1} appearance 1512×765 {candidates:1,total:0,original:1}
  posts    1803×908 {candidates:1,total:0,original:0}   posts    1512×765 {candidates:1,total:0,original:0}
  general  1803×908 {candidates:1,total:0,original:0}   general  1512×765 {candidates:1,total:0,original:0}

guest ?page=general（隔离上下文）: {"inputs":0,"sidebarRows":0,"hasFail":false,
  "body":"ArcBlog\n设置\n使用 DID Wallet 登录后管理本实例的通用设置。\n使用 DID Wallet 登录"}   ← 无泄漏

D24/UI-008 §9 新增判据（UI 标为「受限未验证」，QA 本轮补验）:
  sidebar {w:270, scrollH:916, clientH:860, overflow:"auto", lastChild:"ArcBlog\nAbout\nRSS\n© 2026 ArcBlog"}
  footerBottomBefore=963.5 → scrollTop=max → footerBottomAfter=907.5 ≤ viewportH 908 → footerReachable=true

消费方基线: RSS items=3 / <language>en</language> / stderr 空；agent check exit 0
```

**结论：无新增回归失败。** UI-008 §6.3 的侧栏滚动判据由 **QA 独立实测确认可达**（把 UI 的「逻辑推得」升级为实测）。

---

## 3. 原始命令与结果摘录

### 快层门 + 构建一致性

```text
$ arc dsl validate --json | tail -2
  "issues": []

$ npm test | tail -6
ℹ tests 28
ℹ suites 0
ℹ pass 28
ℹ fail 0
ℹ duration_ms 1042.910709
fast tier passed — this is the gate.

$ node scripts/arcblog-console-nav.mjs --check
{ "ok": true, "action": "check", "pages": 18 }

$ arc dsl generate --check
Would generate 0 file(s) (dry-run) — nothing to change

$ diff -rq scripts dist/scripts     → （无输出，SAME）
$ diff -r .aup dist/.aup
Only in .aup/man: general.yaml
Only in dist/.aup/man: settings.yaml
（exit 1）                                    ← 唯一非 SAME，见 §7 / BUG-027

$ grep -rEn '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(' .aup/pages .aup/wrapper.aup     → 0 命中
```

### 定向 live（`.gate-lock` 持有期间串行；**未跑全量 live**）

```text
$ npm run test:file -- scripts/arcblog-settings.test.mjs
✔ show reports the three appearance settings with their surfaces
✔ set rejects a value outside the record's options and leaves it untouched
✔ live: a CLI write changes what a signed-out reader (and the bridge) sees, then restores
ℹ tests 3  pass 3  fail 0  duration_ms 7326.7

$ npm run test:file -- scripts/arcblog-rss.test.mjs
✔ rss outputs xml with channel
✔ rss includes published post when available
ℹ tests 2  pass 2  fail 0  duration_ms 6609.1

$ npm run test:file -- scripts/arcblog-agent.test.mjs
✔ run refuses closed and unavailable tools with distinct codes
✔ run requires a grant before a write tool, and agent.admin cannot be granted
✔ live: read tools answer from AFS and a granted write tool runs
✔ get_analytics aggregates public surfaces only (spec §60/§62)
ℹ tests 21  pass 21  fail 0  duration_ms 32529.4
```

### 写入闭环（页面 → AFS → 消费方）

见 §2①(a)(b)(c) 的原始 JSON/命令；改前/改后 `updatedAt` 均逐条留证。

---

## 4. 负面用例

| # | 输入 | 期望 | 实际 | 结论 |
| -- | ---- | ---- | ---- | ---- |
| N1 | 页面：`language` 控件注入选项外值 `fr` + 保存 | 拒绝、记录不变 | 控件回弹 `""`；真实点击后无 toast、`:invalid`、AFS `updatedAt` 不变 | ✅ |
| N2 | 全新标签页（未预填）直接点 `Language` Save | 不误覆盖 | AFS 未改写（与 N1 同一次） | ✅ |
| N3 | 带外写入 `language=fr` 后跑 RSS | 不把选项外值带进公开产物 | `<language>en</language>` + stderr WARN + stdout 纯 XML | ✅ |
| N4 | `general show` 在带外脏值下 | 留痕且不吞其它字段 | `issues` 含 language(存储 fr → 生效 en)；其余 5 字段 effective 正常 | ✅ |
| N5 | 旧深链 `?page=settings-general` / `?page=settings` | 有可解释行为 | 静默回落公开首页、无 `SESSION INIT FAILED`（平台行为） | ✅（登记） |
| N6 | 深链 `?page=admin`（compose-edit gate 的目标） | 若指向真实页则应渲染 | 回落公开首页 → 该 gate 目标不存在 | ⚠️ → BUG-026 |
| N7 | guest 访问 `?page=general` | 只见登录卡、无泄漏 | `inputs:0, sidebarRows:0`，仅 gate 文案 | ✅ |

---

## 5. 新增 / 更新的 BUG

| 编号 | 级别 | 标题 | 状态 |
| ---- | ---- | ---- | ---- |
| [BUG-021](../bugs/BUG-021-settings-gate-login-return-to-missing-page.md) | P2（原） | gate `return_to` 指向不存在的 `?page=settings` | **已修复（本轮复验通过）** |
| [BUG-022](../bugs/BUG-022-settings-init-copy-contradicts-contracts-29-2.md) | P2（原） | 初始化文案与 §29.2 相反、诱导删记录 | **已修复** |
| [BUG-023](../bugs/BUG-023-settings-page-write-skips-options-validation.md) | **P1（D20 升级）** | 页面写入绕过 `options` → `fr` 进公开 RSS | **已修复（页面受控 + 读取侧 fail-closed 双侧验证）** |
| [BUG-024](../bugs/BUG-024-settings-heading-sizes-off-standard.md) | P2（原） | 9 处 h3 字号偏离 | **已修复** |
| [BUG-025](../bugs/BUG-025-settings-page-multiple-primary-buttons-per-screen.md) | P2（原） | 同屏 3 个 primary | **已修复（0 个）** |
| [BUG-026](../bugs/BUG-026-compose-edit-gate-return-to-missing-page.md) | **P2（新，既有）** | `compose-edit` gate 指向不存在的 `?page=admin` | 待裁决 |
| [BUG-027](../bugs/BUG-027-dist-stale-after-man-rename.md) | **P1（新，阻断）** | `.aup/man` 改名后未重跑 `arc blocklet build`，`dist` 漂移 | 待修（一条命令） |

---

## 6. 受限未验证清单

1. 真实 DID Wallet 登录回跳（无钱包）——只证明 target 页存在且在 admin 会话渲染。
2. `onErrorToast` 的真实触发（平台拒绝未无损诱发）——仅静态确认接线与错误文案键。
3. 深色模式、非 admin 已登录会话、zh 管理端最终构建逐页复核。
4. Dev 提出的平台契约（`pattern=` 在 `afs-list` 行模板被服务端按未替换字面量复核 → `validationFailed` 假成功）**未由 QA 复现**；作为**线索**转交 Lead/PM 收录 `docs/arc-contracts.md`（该文件不在 QA 写范围）。
5. `dist/docs/**` 会因本轮 QA 报告/BUG 落盘而在下次 build 中更新（round-11 §1.1 已确认属正常产物）；`dist` 的门禁差异只有 `.aup/man` 一对。

---

## 7. 阻断项（唯一）

**BUG-027（P1，构建一致性 / 门禁未满足）**：`.aup/man/settings.yaml` → `.aup/man/general.yaml` 的改名发生在 09:59:41，而 `dist/**` 最后一次 `arc blocklet build` 是 09:57:48（`dist/.aup/man/*` 全部 mtime=09:57:48；`dist/.aup/pages/admin/general.aup` 已在，说明页面改名早于那次 build，man 改名晚于它）。因此：

```text
$ diff -r .aup dist/.aup
Only in .aup/man: general.yaml
Only in dist/.aup/man: settings.yaml
$ git status --porcelain .aup/man dist/.aup/man
 D .aup/man/settings.yaml
?? .aup/man/general.yaml
```

**影响**：构建门的「改了 `.aup` 就 `arc blocklet build`」当前**不满足**；`dist` 里仍是过期 man 存根（`page: settings`）。**修复**：Dev/Lead 跑一次 `arc blocklet build`（QA 不写 `dist`，故未代跑），随后 `diff -r .aup dist/.aup` 应无输出。

**另一条一致性事实（不阻断，供 Lead 参考）**：Dev 的自述「`.aup/man/settings.yaml` 仍是过期脚手架存根、`.aup/man/**` 不在本轮写范围、未完成」与工作区**不一致**——该文件已在 09:59:41 被改名为 `general.yaml`（内容仍为 TODO 存根，但 `page:` 已从保留字 `settings` 改为 `general`）。QA 按工作区实况记录。

---

## 8. 实例与探针清理自证

```text
# 写锁（任何写实例动作之前落盘，跑完删除）
$ rm -f docs/team/.gate-lock; ls docs/team/.gate-lock
ls: docs/team/.gate-lock: No such file or directory        ← 锁已释放

# 六条 General 记录回到 CLI 定义默认形态；无 issues
$ node scripts/arcblog-settings.mjs general show
{"ok":true,"issues":[],
 "values":{"site-name":{"stored":"ArcBlog","effective":"ArcBlog"},
           "language":{"stored":"en","effective":"en"},
           "timezone":{"stored":"UTC","effective":"UTC"},
           "comments":{"stored":false,"effective":false},
           "rss":{"stored":true,"effective":true},
           "agent-access":{"stored":true,"effective":true}}}

# 目录内容 = 恰好 3 + 3，无新增探针记录
$ arc afs exec /.actions/list config/general   → language.json,site-name.json,timezone.json
$ arc afs exec /.actions/list config/switches  → agent-access.json,comments.json,rss.json
$ arc afs exec /.actions/list config | (脚本) total=129, probe-like=[]
    （最新条目为既有目录 general/switches；无 2026-09-28 10:0x 之后的探针记录）

# 消费方回到基线
$ node scripts/arcblog-rss.mjs --feed-link https://example.com   → <language>en</language>, items=3, stderr 空
$ node scripts/arcblog-agent.mjs check                            → exit 0

# 仓库无探针残留（临时脚本全部在 /tmp）
$ git status --porcelain | grep -iE "probe|qa11|reverify|tmp"     →（无输出）
```

**须披露的写入副作用（1 条）**：为验证 ①c，QA 用 `/.actions/write`（`mode: tree-merge`）把 `language` 带外写成 `fr`，随后**原样写回 `en`**；`createdAt`（`2026-09-28T01:18:46.783Z`）与元数据字段未变。其余五条记录本轮**未改**（页面对 `language` 的合法值 `zh` 写入也已复位为 `en`）。

**验证工具（全部 /tmp，未入库）**：`/tmp/qa11r-cdp.mjs`、`/tmp/qa11r-pages.mjs`、`/tmp/qa11r-multi.mjs`、`/tmp/qa11r-realclick.mjs`、`/tmp/qa11r-scan-pages.mjs` 及 `qa11r-spec-*.json` / `qa11r-cfg-*.json` / `qa11r-out-*.txt`。

---

## 9. 放行结论

**不放行（Fail）。**

- 门槛逐条：快层门 4/4 全绿 ✔；定向 live 26/26 全绿 ✔；复验项 ①–⑥ 的功能面全部通过（BUG-021…025 五条闭环）✔；负面用例 7 条 ✔；18 页 + BUG-010/011 回归无新增失败 ✔；**唯一不合格项 = 构建门**：`.aup/man` 改名后 `dist` 未重建 → **BUG-027（P1）阻断**。
- **需要谁做什么**：Dev/Lead 跑一次 `arc blocklet build`（QA 不写 `dist`），然后只需复跑 `diff -r .aup dist/.aup`（期望无输出）+ `arc dsl validate --json`（`issues:[]`），即可把本轮改判为**放行**；功能面无需重验（本轮已全绿，且 build 不改源码语义）。
- **建议 PM/Lead 裁决**：BUG-026（compose-edit gate `?page=admin` → 应指向真实页，1 行，P2）本轮或 R12；`compose-edit` 的 21.6px 标题 / 32px 按钮（范围外观察）入 R12。
- **不阻断但需登记**：D23（V3 destructive 3.99:1）本轮不修；V8/D24 侧栏自滚（QA 已实测页脚可达）；D25 不补 `seed/settings/arcblog/**`。

`VERDICT=fail, BLOCKING=1`
