# round-6 复验报告（BUG-001..004 修复的独立验证）

| 字段 | 值 |
| ---- | -- |
| 轮次号 | round-6（复验） |
| 复验对象 | `docs/team/bugs/BUG-001` … `BUG-004` 的修复（task-6 产物） |
| 被测产物 | `.aup/pages/site/tags.aup`、`scripts/arcblog-tags.mjs`、`scripts/arcblog-tags.test.mjs`、`.aup/locales/{en,zh}.json`、`dist/**` |
| 上游 | `docs/team/test-reports/round-6.md`（初验：不放行）、`task-6`（Dev 修复，completed）、`task-7`（本复验） |
| 验证人 | QA |
| 验证时间 | 2026-09-27（UTC 12:40–13:05） |
| 结论 | **放行**（BUG-002 P1 已修复且反向复验通过；BUG-001/003/004 已修复；A11 原条款平台受限，按 Lead 给定的替代口径验收通过——两件事在 §9 分开写） |

---

## 0. 验证方式与快照

- **不采信 Dev 自述**：下方每条结论都由 QA 自己重跑/自己点击得出，原始输出在 §2–§4。
- **源码冻结**：复验起点与终点（UTC 12:40 → 13:05）对 5 个被测文件重算 sha256，**完全一致**：

```text
64b2eb85c5ff1b214d0d44284cc7e11803160b06863e5f9fac849b34f1c9e47e  .aup/pages/site/tags.aup
aaf1b3bb298f79f1d82436717b1bb10b4e5a7c04047cd1d817b44b2efad38a99  scripts/arcblog-tags.mjs
d90280454418e59c4f0757fa025c2d440b8a7e0d9cfde3beb05cfc08e0c5f630  scripts/arcblog-tags.test.mjs
0f8375bfaf70ff3f865c6e5a047fecc3b91a219810033ae0f89c8de7c63a652a  .aup/locales/en.json
e187b5acbd546c4752671373af7d0857c47bbf756509952d9872b9e35f4c8737  .aup/locales/zh.json
```

- **界面断言真实执行**：本机共享调试 Chrome（CDP 9333）的 admin 会话，QA **新开标签页**；本轮 BUG-002 的复现是**同一次页面会话内**「提交改名 ×2 + 点 Refresh projection」，全部真实点击。匿名断言用独立 incognito context。
- **实例串行**：live 单文件前 `docs/team/.gate-lock` 不存在 → 自写一行 `qa … 12:56:40Z` → 跑完删除。**未跑 `npm run test:live`**（留给 Lead 轮末）。
- **写入范围**：本报告 + 4 个 BUG 文件的状态更新 + 1 张截图；未改任何源码/测试。

---

## 1. 逐条 BUG 复验结论

| BUG | 级别 | 结论 | 一句话证据 |
| --- | ---- | ---- | ---------- |
| **BUG-002** | **P1（阻断）** | ✅ **已修复并复验通过** | 同一页面会话「改名 ×2 + Refresh」→ 3 条**独立** intent 记录（唯一 id/path，无覆盖）→ `apply` `applied: 3`，两条 merge + refresh 全部 done → 文章 `tags/version/contentHash` 与等价 CLI `merge` **逐字段一致**；异内容同 id 再入队 → exit 1 `CONFLICT`，原记录未被覆盖 |
| **BUG-001** | P2（同时是 A11 项） | ✅ **已修复（按替代口径）** | 有数据与空投影两种状态下：可见 `primary` **都 = 1**；不再出现「No tag in use yet?」误导声明；列表后常驻 dim 说明（`rgb(107,107,120)`）两态都渲染；无整页滚动条；无硬编码色。⚠️ A11 原条款「空态卡仅无数据时出现」平台受限 → §9 |
| **BUG-003** | P2 | ✅ **已修复并复验通过** | 界面写入的 intent 记录里不再有 `requestedBy`/字面量 `"$session.did"`，改为 `requestedVia: "console"`；`requestedAt` 正常插值为真实时间戳 |
| **BUG-004** | P3 | ✅ **已修复并复验通过** | `tags.list-empty` / `tags.queue-empty` 在 en/zh locale 与页面引用**同时消失**（各 0 命中），页内已无 `emptyText`；`arc dsl lint` 仍只有 10 条既有 `unreferenced_explicit_id`，`npm test` 死键门绿。空列表仍显示运行时默认英文 `No items to display` → 平台限制（§7） |

**未修复项：无。因此本轮未新增 BUG 文件。**

---

## 2. BUG-002 反向复验（核心，P1）原始输出

### 2.1 同一次页面会话：提交改名 ×2 + 点 Refresh projection

```text
# CDP（admin 会话，?page=tags，新标签页）——真实点击，同一会话
[表单1] Tag=ui_keep / New name=ui_keep_two → 点 "Queue rename / merge" → 确认框确认  → toast "Intent queued…" = True
[表单2] Tag=ui_src  / New name=ui_src_two  → 点 "Queue rename / merge" → 确认框确认  → toast "Intent queued…" = True
[按钮 ] 点 "Refresh projection"
submit1 后队列含 rename1        : True
submit2 后队列含两条 rename     : True
可见 primary 按钮              = ['Queue rename / merge']      ← 同屏只有 1 个 primary

--- 队列区（Refresh 之后，同一屏） ---
merge   ui_keep → ui_keep_two   pending
merge   ui_src  → ui_src_two    pending
refresh --                      pending        ← 三条同时存在，Refresh 没有吃掉任何一条
```

### 2.2 AFS 侧：多条独立记录、无覆盖（唯一 id/path）

```text
$ arc afs exec /blocklets/arcblog/.actions/list --args '{"path":"/instance/app/arcblog/tags/intents"}' --json
记录数 = 3
 - /instance/app/arcblog/tags/intents/2026-09-27T12:52:31.585Z.json
 - /instance/app/arcblog/tags/intents/2026-09-27T12:52:35.081Z.json
 - /instance/app/arcblog/tags/intents/2026-09-27T12:52:37.083Z.json
唯一 path 数 = 3 | 是否全部唯一 = True

$ 逐条 read
2026-09-27T12:52:31.585Z  action=merge  ui_keep -> ui_keep_two  status=pending  requestedVia=console
2026-09-27T12:52:35.081Z  action=merge  ui_src  -> ui_src_two   status=pending  requestedVia=console
2026-09-27T12:52:37.083Z  action=refresh                       status=pending  requestedVia=console
```

### 2.3 `apply` 执行每一条 pending，文章与等价 CLI 一致

```text
$ node scripts/arcblog-tags.mjs apply
{"ok":true,"action":"tags-apply","applied":3,"intents":[
  {"id":"2026-09-27T12:52:31.585Z","action":"merge","status":"done","migrated":1,"message":"rewrote 1 post(s): ui_keep → ui_keep_two"},
  {"id":"2026-09-27T12:52:35.081Z","action":"merge","status":"done","migrated":1,"message":"rewrote 1 post(s): ui_src → ui_src_two"},
  {"id":"2026-09-27T12:52:37.083Z","action":"refresh","status":"done","migrated":0,"message":"projection rebuilt"}]}

P1 before apply: tags = ['ui_src', 'ui_keep']            version = 1  hash = sha256:6146378c…
P1 after  apply: tags = ['ui_src_two', 'ui_keep_two']    version = 3  hash = sha256:2090db17…
                 ↑ 两次改写各 +1（1→2→3）、hash 变化

# 等价 CLI 组（P2 同 before-state，跑与队列等价的 merge 命令）
P2 before: tags = ['ui_src', 'ui_keep'] version = 1
$ merge --from ui_keep --to ui_keep_two  → migrated = 1
$ merge --from ui_src  --to ui_src_two   → migrated = 1
P2 after : tags = ['ui_src_two', 'ui_keep_two'] version = 3

interface(UI) tags/version : ['ui_src_two', 'ui_keep_two'] 3
cli        tags/version : ['ui_src_two', 'ui_keep_two'] 3
剥离 title/slug/时间戳/hash 后完全一致 : True
version 增量一致 (1 -> 3, 两次改写) : True
```

### 2.4 CONFLICT 守卫：异内容同 id 不覆盖

```text
$ node scripts/arcblog-tags.mjs request --id qa-conflict --from alpha_one --to alpha_two
queued id = qa-conflict | alpha_one -> alpha_two | status = pending

$ node scripts/arcblog-tags.mjs request --id qa-conflict --from beta_one --to beta_two
exit=1
stderr: {"ok":false,"code":"CONFLICT","error":"intent \"qa-conflict\" is still pending (merge alpha_one → alpha_two); run `apply` or `watch` first, or pick another --id"}

$ node scripts/arcblog-tags.mjs request --id qa-conflict --from alpha_one --to alpha_two   # 同内容
exit=0                                        ← 幂等，不误报

$ arc afs exec …/.actions/read --args '{"path":"…/intents/qa-conflict.json"}' --json
stored: {'id': 'qa-conflict', 'action': 'merge', 'rawFrom': 'alpha_one', 'rawTo': 'alpha_two', 'status': 'pending'}
        ← 冲突的那次**没有写入**，原 pending 记录保持原样
```

---

## 3. BUG-001 / A11 —— 按 Lead 修正后的可观察口径（写数值）

用 CDP 新开标签页读取计算样式/`offsetWidth`。两态：**A 有数据**（5 个标签，含探针）、**B 空投影探针**（只清 `tags/items/*` + `snapshot/current.json`，随后 `project` 复原）。

| 观测项 | 状态 A（有数据） | 状态 B（空投影） | 期望 | 结论 |
| ------ | ---------------- | ---------------- | ---- | ---- |
| 可见 `primary` 数量 | **1**（`['Queue rename / merge']`） | **1**（`['Queue rename / merge']`） | 都 = 1 | 通过 |
| 误导性空态声明「No tag in use yet?」 | **false** | **false** | 不再出现 | 通过 |
| 常驻 dim 说明渲染（`Where these tags come from` + 正文） | true / true | true / true | 两态都渲染 | 通过 |
| 说明文字颜色（dim） | `rgb(107, 107, 120)` | `rgb(107, 107, 120)` | 非强调色 | 通过 |
| 列表行数 | 5 | 0 | — | 符合 |
| 整页滚动条 | `pageHasScrollbar = false`（doc 908/908/908） | `false`（908/908/908） | 无整页滚动条 | 通过 |
| 硬编码色值 | `no hardcoded color` | 同 | 无 | 通过 |
| 页头操作层级 | `Write a post` / `Refresh projection` 均为 secondary | 同 | 不抢 primary | 通过 |

```text
$ grep -nE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' .aup/pages/*/tags.aup || echo "no hardcoded color"
no hardcoded color

# 空投影下的列表区文本（BUG-004 平台限制 + 说明卡仍在）
'Tags in use\nNo items to display\nWhere these tags come from\nA tag appears here as soon as a post carries one: add tags while writing, then press Refresh '

# 复原
$ node scripts/arcblog-tags.mjs project    → project count = 5（与 list 一致）
```

截图（有数据态，页头两个 secondary + 列表后 dim 说明）：`assets/round-6-reverify-single-primary.png`

---

## 4. BUG-003 / BUG-004 原始证据

```text
### BUG-003：界面写入的完整 intent 记录（提交改名后读回）
{
 "id": "2026-09-27T12:52:31.585Z",
 "action": "merge",
 "from": "ui_keep", "to": "ui_keep_two",
 "rawFrom": "ui_keep", "rawTo": "ui_keep_two",
 "summary": "ui_keep → ui_keep_two",
 "status": "done",
 "message": "rewrote 1 post(s): ui_keep → ui_keep_two",
 "migrated": 1,
 "posts": [{"slug": "req001-rv-p1-1790513520", "dir": "drafts", "version": 2}],
 "requestedVia": "console",                                  ← 新字段
 "requestedAt": "2026-09-27T12:52:31.585Z",                  ← ${generate.timeiso} 正常插值
 "updatedAt": "2026-09-27T12:53:00.010Z"
}
→ 无 requestedBy、无字面量 "$session.did"；源码里也 grep 不到（见下）

$ grep -n '\$session.did' .aup/pages/site/tags.aup || echo "no \$session.did in tags.aup"
no $session.did in tags.aup

### BUG-004：声明了但永不渲染的活键消失
tags.list-empty   locale(en)=0  locale(zh)=0   page-ref=0
tags.queue-empty  locale(en)=0  locale(zh)=0   page-ref=0
$ grep -n 'emptyText' .aup/pages/site/tags.aup   → no emptyText in tags.aup
新键 tags.enqueue-failed 在 en/zh 都在（locale:460）且被页面 2 处 onErrorToast 引用。

$ arc dsl lint
Passed DSL lint  (files: 45)
  WARNING unreferenced_explicit_id × 10（均为既有：index/factory/wrapper 的运行时 id）
→ 无新增 issue、无 dead_locale_keys（与 CLAUDE.md 记的基线 10 一致）
```

---

## 5. 门与回归

```text
$ arc dsl validate --json          → ok = True | issues = []
$ arc dsl generate --check         → Would generate 0 file(s) (dry-run) — nothing to change
$ npm test                         → tests 28 / pass 28 / fail 0（含 generate 漂移门 + 死 locale key 门）
$ node scripts/arcblog-console-nav.mjs --check → {"action":"check","pages":17} exit 0

# live 单文件（gate-lock 下串行；跑前 clean --confirm found=0、project count=5）
$ cat docs/team/.gate-lock
qa (task-7 Round 6 复验) started 2026-09-27T12:56:40Z — live single-file regression (arcblog-tags.test.mjs)
$ npm run test:file -- scripts/arcblog-tags.test.mjs
✔ tag merge renames the tag on every referencing post and bumps version (54435ms)
✔ tag merge requires two different tags (36ms)
✔ every queued intent keeps its own record and apply executes all of them (51578ms)     ← 新
✔ a pending intent is never silently replaced (CONFLICT, not overwrite) (4133ms)         ← 新
✔ applyIntent writes back to the record it read, not to the id (2497ms)                  ← 新
✔ the console page writes uniquely-named intents and no un-interpolated template (0.9ms) ← 新
✔ the projection mirrors list and a no-op refresh rewrites nothing (39635ms)
✔ a queued merge applies through the same rewrite as the CLI and retires the source row (44504ms)
✔ an unknown source tag is a noop, not a success, and writes nothing (45357ms)
✔ a self-merge or an empty pair is rejected without touching any post (10107ms)
✔ raw form input is normalized when the worker executes it (REQ-001 A7) (48074ms)
✔ category remove refuses while referenced; merge migrates then removes (89200ms)
ℹ tests 12 / pass 12 / fail 0 / duration_ms 390694        real 6m31s   exit 0
$ rm -f docs/team/.gate-lock                              → 已删除（复确认 No such file）

# 快层单文件回归
scripts/arcblog-console-nav.test.mjs  → tests 7 / pass 7 / fail 0
scripts/arcblog-permissions.test.mjs  → tests 6 / pass 6 / fail 0
scripts/arcblog-runtime-ids.test.mjs  → tests 3 / pass 3 / fail 0
scripts/arcblog-i18n.test.mjs         → tests 5 / pass 5 / fail 0

# 产物同步（源与 dist 一致）
same : .aup/pages/site/tags.aup / .aup/locales/en.json / .aup/locales/zh.json / scripts/arcblog-tags.mjs
```

**无新增失败。** 本轮未出现全量红，因此不需要「单跑失败文件判假红」。

---

## 6. 新增 BUG / BUG 文件状态

| BUG | 级别 | 复验结论 | 文件状态 |
| --- | ---- | -------- | -------- |
| BUG-001 | P2 | 已修复并复验通过（替代口径） | 状态更新为「已修复并复验通过（round-6 复验；A11 原条款平台受限见报告 §9）」 |
| BUG-002 | P1 | 已修复并复验通过 | 同上（附 §2 证据） |
| BUG-003 | P2 | 已修复并复验通过 | 同上 |
| BUG-004 | P3 | 已修复并复验通过 | 同上 |

**未修复项：无 → 本轮无新 BUG 文件。**

---

## 7. 受限未验证项

| 项 | 原因 | 影响 |
| -- | ---- | ---- |
| 界面 `onErrorToast` 的运行期触发 | 入队失败需要一个**已登录但非 admin** 的会话（`replicated.tags` 是 `minRole: admin`，写会被拒），本机只有 admin 会话，无法新建非 admin 身份 | 未阻断。静态证据：两处写操作都挂了 `onErrorToast={message: "$t(tags.enqueue-failed)"}`，`tags.enqueue-failed` 在 en/zh 都在；AFS 层的越权拒绝由 `scripts/arcblog-permissions.test.mjs`（6/6）覆盖。**失败路径的运行期提示未验证** |
| 空列表的本地化文案 | `emptyText` 在 `afs-list` 上不求值（平台行为，`CLAUDE.md` 已记）；Dev 按「不留下永不渲染的活键」处理，删除声明并改为页级常驻说明 | 空列表仍显示运行时默认英文 `No items to display`。按 Lead 口径这属**平台限制**，不判 Dev 未修；`emptyText` 一旦被平台支持可再做 |
| A11 §9 的像素级视觉项 | QA 只做可量化断言（primary 数、可见性、颜色、文本、滚动条） | 视觉一致性仍建议 UI 在 REQ-002 收口时补该页走查（任务顺延 Round 7） |

**残余风险（不阻断，未开 BUG；如需请 PM 定 P3）**：`/.actions/write` 的 AFS 层没有跨写守卫 —— QA 用同一 path 连续写两次不同内容，读回的是第二次（`collide-B`）。界面侧的保护是**每次提交写唯一 `${generate.timeiso}` path**；两次提交落在同一毫秒才会覆盖，而每次提交都要过一次确认框交互（≥数十毫秒），**UI 不可达**。CLI 侧另有 `enqueueIntent` 的 CONFLICT 守卫。故本轮判为非阻断。

---

## 8. 实例复原

```text
# 收尾
探针文章 P1/P2              → 逐条删除（.actions/delete success）
intent 记录 4 条（3 条 UI + qa-conflict） → 逐条删除；intents 目录回到不存在（LIST_ERROR: Path not found）
collision-test.json         → 已删除
clean --confirm（第一轮）    → found = 0 removed = 0
clean --confirm（第二轮，清 live 测试自身 8 条 fixture） → found = 8 removed = 8（byDir: drafts 8）
project（两次）              → final projection count = 3

$ node scripts/arcblog-tags.mjs list
final tags = 3 [('guide', 1), ('identity', 1), ('product', 1)]

$ arc afs exec …/list --args '{"path":"/instance/app/arcblog/tags"}'
 - /instance/app/arcblog/tags/items
 - /instance/app/arcblog/tags/snapshot          ← intents 目录已不存在；无 unit-* 残留
QA 探针标签残留检查（ui_/req001/alpha_/beta_）: 0
```

`docs/team/.gate-lock` 已删除；QA 只写了 `docs/team/test-reports/**` 与 `docs/team/bugs/**`。

---

## 9. 放行结论

**结论：放行**

### 9.1 修复已验证（本轮放行的硬条件）

- **BUG-002（P1，唯一硬条件）→ 已修复并复验通过**：
  - 同一页面会话「改名 ×2 + Refresh projection」→ `tags/intents/` 下 **3 条独立记录**（唯一 id=path=`<timeiso>.json`，3/3 唯一），**无覆盖**；
  - `apply` → `applied: 3`，两条 merge 与 refresh **全部 done**；
  - 目标文章 `tags = ['ui_src_two','ui_keep_two']`、`version 1→3`、`contentHash` 变化，与等价 CLI `merge` 组**剥离 title/slug/时间戳/hash 后完全一致**；
  - 异内容同 id 再入队 → exit 1 `CONFLICT` + 明确提示，AFS 上原 pending 记录**未被覆盖**；同内容再入队 exit 0（幂等）。
- **BUG-001 / BUG-003 / BUG-004 → 已修复**：两态 `primary` 都是 1、无误导性空态声明、常驻 dim 说明两态都渲染、无整页滚动条、无硬编码色；intent 记录 `requestedVia: "console"` 且无 `$session.did` 字面量；两个永不渲染的活键在 locale 与页面同时消失，`arc dsl lint` 无新增、死键门绿。
- 门与回归：`arc dsl validate --json` issues 为空；`npm test` 28/28；live `arcblog-tags.test.mjs` **12/12**（6m31s，gate-lock 串行）；console-nav 7/7、permissions 6/6、runtime-ids 3/3、i18n 5/5；`generate --check` 无漂移、源/`dist` 一致。
- **无未裁决的 P0/P1**；未修复项为 0，本轮无新 BUG。

### 9.2 A11 平台受限 / 替代口径（与 9.1 分开，避免误读）

- **REQ-001 A11 原条款**（「空态引导卡只在无数据时出现」+ §9 清单逐项通过）在本平台**受限不可达成**：严格 `visible` 互斥做不到（`propBind` 首屏不解析；`visible="$entry.content.*"` 恒真、`!${…}` 恒隐藏——Dev 实测，QA 未复现该结论本身，但复验了替代口径的**可观察结果**）。
- QA 本轮验的是 **Lead 给定的替代口径**，全部通过（§3 表）：有数据/空投影两态可见 `primary` 均 = 1、不再有误导性空态声明、列表后常驻 dim 说明两态都渲染、无整页滚动条、无硬编码色。
- **因此 A11 记为「平台受限，按替代口径验收通过」**，不是「原条款通过」。是否接受该替代口径由 **PM 裁决**，并把该平台事实记入 `docs/arc-contracts.md`（由 **Lead** 落笔）——QA 不改标准。
- REQ-002 顺延项（F7 grid `minmax(380px)`、F12 源标签选择器、F13 队列动作名 `scale=lg`）仍留在 task-5 / Round 7，不在本轮范围。

### 9.3 遗留（不影响放行）

- 界面 `onErrorToast` 的运行期触发受限未验证（无非 admin 身份），见 §7。
- 空列表本地化文案属平台限制（`emptyText` 不求值），见 §7。
- AFS 层无跨写守卫的残余风险（UI 不可达），见 §7。
