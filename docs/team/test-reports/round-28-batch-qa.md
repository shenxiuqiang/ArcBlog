# Round 28 批次末统一 QA 报告（批次 = R25–R28）

> **执行者**：QA（独立验证；**不看任何自述**，全部数值由本次会话自写探针重取）
> **时间窗**：2026-09-29 14:57–15:45 CST ｜ **HEAD 基线**：`752e4cd`（工作区 = R25–R28 未提交改动）
> **daemon**：实例 `default`，pid **33421**，Started `2026-09-29T06:46:05.657Z`（= 14:46:05 CST，**晚于**本批 `.aup` 最后修改 14:45:49 ⇒ 运行期读数反映本批改动）｜端口 4939 / `http://arcblog.localhost:4939` → 200
> **浏览器**：Chrome/153.0.8010.54，CDP `http://127.0.0.1:9333`
> **锁**：全程持有 `docs/team/.gate-lock`（owner `QA (batch-end QA R25-R28)`，started 14:57）；所有实例写操作与 live 单跑串行；锁在报告写盘后删除（§7 自证）
> **探针**：`/tmp/qa/probe.mjs`（矩阵）、`/tmp/qa/policyclick.mjs`、`/tmp/qa/clickbtn.mjs`、`/tmp/qa/active.mjs`、`/tmp/qa/kvlabel.mjs`（**全部 QA 自写**，未复用 lane N/O 的 `UI-018-*` 脚本或其输出）；原始输出 `/tmp/qa/*.json｜*.txt`
> **纪律**：每个 (页面, 语言, 视口) 组合新建 `Target.createBrowserContext` + 单 page target，用后 `disposeBrowserContext`；page target 数 12 → 12（未新增常驻 target）；**禁止全量 `test:live`**（本报告只跑 3 个定向文件）；零 git 写操作

---

## 0. 结论摘要（先读这一节）

| 维度 | 结论 |
| --- | --- |
| **A. 本轮修复 D1/D2/D3/D4/D5/D8** | **全部关闭**（逐项见 §2；D3 的 hub 队列 `Clear` 一处**仅静态确认**，见 §2.3） |
| **B. 批次回归 R25–R27** | B②③④⑤ **通过**；B① **通过**；B⑥ **部分不通过**（`chain-worker` 未知 flag 输出 `RUNTIME_ERROR` 裸栈，非 `VALIDATION` → BUG-082）；B⑦ 3 个定向 live **全绿**（6/6、52/52、10/10） |
| **C. 门** | validate ✅ `issues []`；`generate --check` ✅ 0 漂移；`console-nav --check` ✅ pages 21；`diff -r` `.aup`/`.web` ✅ 空；`dist-secrets --check` ✅；**`npm test` ❌ 55 tests / 54 pass / 1 fail**（ui-budget ratchet，→ **BUG-080 P1**） |
| **C. 红线** | 21 页 ×{en,zh} **恰 1 个导航 active**（`aria-current="page"`）42/42、**0 `SESSION INIT FAILED`**、`deOver=0` 42/42；**零真实链写 / 零资金**（`pending.json` sha `fef80b4f…` 未被触碰、`factories.json` 无 txHash）；实例探针记录清理自证见 §4.4 |
| **新增 BUG** | **BUG-080（P1）**、**BUG-081（P1）**、BUG-082（P2）、BUG-083（P3） |
| **机读结论** | **VERDICT=fail, BLOCKING=2**（BUG-080 门禁红 + BUG-081 fail-open；无 P0） |

**一句话**：本批要修的 6 项 UI/文案缺陷**独立复测全部关闭**，R25–R27 的三条主链路（策略意图队列 / 页面意图队列 / 角色卡）**运行时行为正确**；但**快层仍红**（基线未重录，属交付态门禁红），且探针暴露 1 条**既有 fail-open**（`chain-worker` 无参数默认 `run`，本次会话真的消费掉一条 pending 链意图，无资金后果）——两点都**未裁决前不放行**。

---

## 1. 方法与纪律（可复现）

| 项 | 值 |
| --- | --- |
| 独立取证 | 自写 5 个 CDP 探针 + 自跑门 + 自跑定向 live；**不引用 lane O/N/M 的自述结论**（只把 `UI-018-new-panels-audit.md` 当「待验对象」与「修前基线」来源） |
| 修前基线 | 仅用于对照 D1：`docs/team/design/UI-018-new-panels-audit.md` §1/§1.1（1512×765 policy 溢出元素 **76（en）/80（zh）**、内容列 **282.30px**、`.aup-time` 盒宽 **8.23/15.23px** 折 3 行） |
| 探针隔离 | 每 (语言,视口) 新 browser context；login cookie 只从既有 tab **只读**取出；不跨组合复用 storage |
| target 账本 | 所有探针 `pagesBefore == pagesAfter == 12` |
| 实例写操作 | 仅 B①/B② 的「真实点击 + 队列 worker」与 `policy apply`，全部在 §4.4 逐条清理并自证；另有一次**意外**的 chain-worker 裸调用（§6 全量披露） |
| 语言落位 | 42/42 运行 `document.documentElement.lang === 请求语言` |

---

## 2. A —— 本轮修复逐项关闭判定（依据 UI-018 的 D1–D8）

### 2.1 A① D1：`policy-products-list` 行内溢出（1512×765 原 76/80 元素）

**命令**：`node /tmp/qa/probe.mjs --pages general,policy,hub,pages --locales en,zh --viewports 1803x908,1512x765 --reload --expand hub,pages --out /tmp/qa/panels.json`
（`so` = 可见元素 `scrollWidth>clientWidth+1`；`so-偏差` = 其中不属于 100vw 全出血祖先链的 = 真实溢出；表的「修前」列取自 UI-018 §1/§1.1，非 QA 自测）

| 组合 | `so` 修前 → 修后 | **`so-偏差` 修前 → 修后** | 内容列宽修前 → 修后 | `.aup-time` 盒宽 / 行数修前 → 修后 | 行 over |
| --- | --- | --- | --- | --- | --- |
| 1803×908 en policy | 2 → 2 | 0 → **0** | 344.14 → **539.31** | 70.08 / 1 → **265.25 / 1** | 0 |
| 1803×908 zh policy | 2 → 2 | 0 → **0** | 344.14 → **576.88** | 77.08 / 1 → **309.81 / 1** | 0 |
| **1512×765 en policy** | **78 → 2** | **76 → 0** | 282.30 → **415.64** | **8.23 / 3 → 141.58 / 1** | **0** |
| **1512×765 zh policy** | **82 → 2** | **80 → 0** | 282.30 → **453.20** | **15.23 / 3 → 186.14 / 1** | **0** |

* `policy-products-list` 范围内 `scrollWidth>clientWidth+1` 的元素：**4/4 组合 = 0**（修前 76/80）；按钮簇计算 `flex = 0 1 auto` / `flexBasis: auto`（修前 `1 0 0%` / `0%`）。
* 16/16 组硬指标：`deOver = 0`、`>R/<L = 0`、`rowOv = 0`、内容区真实溢出 **0**；`so` 保留的 2 个全部 `fullBleedAncestor=true`（`arc-contracts` §21.4/§24 结构性逃逸）。
* 1803 不回归：内容列 539.31/576.88 ≥ 需求 344，`.aup-time` 265.25/309.81 单行。

**判定：D1 关闭（P2 缺陷已消除，无新溢出）。**

### 2.2 A② D2：`?page=general` 冷载 / 刷新都有两段式说明，且不与记录矛盾

**命令**：同上（`general` 每组合含一次 `Page.reload`）；记录存在性另用 `arc afs exec … .actions/read` 核对。

| 语言 | 阶段 | 说明元素 | 可见 | 含 reload/重载 | 含「全新标签页/首次解析」 | 声称记录不存在 | `—` 数 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| en | 冷载 | `general-…-view-5-p-12` | ✅ | ✅ | ✅ | **否** | 20 |
| en | 刷新后 | 同元素 | ✅ | ✅ | ✅ | **否** | 0 |
| zh | 冷载 | 同元素 | ✅ | ✅ | ✅ | **否** | 20 |
| zh | 刷新后 | 同元素 | ✅ | ✅ | ✅ | **否** | 0 |

* 文案（en 原文）：`Reading the dashes: … on a freshly opened tab the rows below can all read as dashes until a reload (or an in-page menu round-trip) resolves them, and the reload shows the real values. A dash never means "no roles". This note is unconditional: it does not claim that any record is missing.`
* zh 原文含：`重载（或用页内菜单往返一次）后即出现真值` + `本说明是常驻的：它不断言任何记录缺失`。
* **记录存在性反例核对**：`arc afs exec …/node/role-verification.json` → `success: true`、`lastVerifiedAt = 2026-09-29T06:10:51.242Z`（记录**存在**）；新文案**没有任何**「记录不存在」断言。`grep -n "does not exist\|不存在" .aup/pages/admin/general.aup` 只命中 **源码注释第 330/333 行**（记录旧文案的反例），**运行期渲染文本 0 命中**。
* 旧键已清理：`grep -rn "roles-no-snapshot" .aup/ dist/.aup/` 仅剩注释；`arc dsl lint --json` → **89 条 `unreferenced_explicit_id`、`dead_locale_keys = 0`**。

**判定：D2 关闭。**

### 2.3 A③ D3：`.aup-action` 计算圆角 = 8px（抽 6 页，含 hub 全部六处）

**命令**：`node /tmp/qa/probe.mjs --pages hub,general,policy,pages,dashboard,factory --locales en,zh --viewports 1803x908,1512x765 --expand hub --out /tmp/qa/panels2.json`（1803×908 en 读数）

| 页 | 页面 `.aup-action` 数 | 计算 `border-radius` | 平台内置控件（非页面 action） |
| --- | ---: | --- | --- |
| **hub** | 17（未展开）/ **18**（展开后） | **全部 `8px`** | 3px 三角按钮（`button`，无 id） |
| pages | 2 | `8px` | — |
| general | 13 | `8px` | 3px ×5 |
| policy | 57 | `8px` | 3px / 4px（分页器） |
| dashboard | 2 | `8px` | — |
| factory | 11 | `8px` | — |

* hub 逐处命中：`…-row-2-action-3` = register（按钮文案 **Apply**）、`hub-relations-list-row-*-row-2-action-1|2|3` = **Approve / Terminate / Purge**（5 行 ×3 = 15）、`hub-advanced-row-3-action-1` = **Show advanced**、`hub-advanced-view-4-row-5-action-1` = **Hide advanced**（展开后）——**六处全部 8px**，内联 `style` 实测 `border-radius: var(--radius-md, 8px)`。
* 同族第 7 处 hub 队列 **Clear**：`hub-intents` 当前 `total=0` ⇒ 行不渲染 ⇒ **仅静态确认**（`.aup/pages/ops/hub.aup:224` 已内联 `style={borderRadius: "var(--radius-md, 8px)"}`）——**受限未验证**（§5 U2）。
* `--radius-md` 实测 = `8px`（6 页一致）。

**判定：D3 关闭（渲染到的 6 页 100% 8px；第 7 处静态确认，列为受限项）。**

### 2.4 A④ D8：general 的 factory 链接不再整页重载；§9 等价断言 total=0

**命令**：§9 原文断言（内联在 `/tmp/qa/probe.mjs` 的 `cddest`）+ 锚点属性普查；16 组合。

| 页 | candidates | linksPerColumn | **total（期望 0）** |
| --- | ---: | --- | ---: |
| **general**（1803/1512 × en/zh） | 1 | `[1]` | **0 ✅**（修前 = 1） |
| policy / hub / pages | 1 | `[0]` | 0 ✅ |

锚点实测：`<a href="/?page=factory" target="_blank" rel="noopener noreferrer" data-aup-id="general-…-view-5-row-29-action-1">`（en 文案 "Open the Node NFT page" / zh 「打开节点 NFT 页」）。
⇒ `target` 生效：本标签页**不发生文档级导航**，§9 硬断言回到 0。
⚠️ **标准张力（登记，需 Lead 追认）**：实现取 lane O 任务书的「新标签页」变体，而设计标准 §2.6 表格把控制台节切换定义为框架内 `-> page <name>`；两种写法都满足 §9。lane O 已在 UI-018 §11.5 请求追认，本报告**不作为缺陷**，只登记为观察项 O1。

**判定：D8 关闭（按本批任务书口径），O1 待 Lead 追认。**

### 2.5 A⑤ D4/D5：hub/pages 队列图例存在且不含 `running`；policy 图例与词表逐字一致

**命令**：`probe.mjs --expand hub`（展开是页内 `-> set`，**零 AFS 写入**；实测点击 `hub-advanced-row-3-action-1` 成功）。

| 队列 | 图例（运行期 `innerText`） | 词表 | 含 `running` |
| --- | --- | --- | --- |
| **policy** | `pending = queued, not run yet · running = claimed by the worker · applied = the policy really changed · rejected = refused, zero change · noop = already in that state, zero bytes written` | `['pending','running','applied','rejected','noop']` **顺序与 `scripts/lib/intents.mjs` 的 `INTENT_STATUSES` 逐字一致** | 是（应当）|
| **hub** | `pending = queued, not run yet · applied = the worker ran it · rejected = refused, zero change · noop = already in that state` | `['pending','applied','rejected','noop']` | **否 ✅** |
| **pages** | 同 hub（en/zh 一致，无需展开即可见；`pages-intent-list` 卡内命中） | 同上 | **否 ✅** |

* 两页的队列**标题 + 图例**都在（hub 在「高级」区内，展开后可见；pages 常显）；zh 图例逐字为 `pending = 已排队、尚未执行 · applied = worker 已执行 · rejected = 被拒绝、零改动 · noop = 已是该状态`。
* 词表核对：`node -e "import('./scripts/lib/intents.mjs')"` → `INTENT_STATUS = {pending,running,applied,rejected,noop}`；policy 图例 5 词 = 词表 5 词、**无同义词**。
* **诚实附注**：`?page=pages` en 全页仍有 **1 条**含 `running` 字面的叶子 = `offline-hint` 的动词短语 `watch keeps running`（zh 0 条）——它在**队列卡之外**、不是状态词声明（lane O 已披露），**不作为缺陷**，登记为观察项 O2。

**判定：D4 / D5 关闭。**

### 2.6 A 小计

| 项 | 判定 | 证据锚点 |
| --- | --- | --- |
| D1 | ✅ 关闭 | §2.1（1512 真实溢出 76/80 → 0） |
| D2 | ✅ 关闭 | §2.2（冷载+刷新可见、无矛盾、旧键已删） |
| D3 | ✅ 关闭（1 处受限） | §2.3（6 页 8px） |
| D4 | ✅ 关闭 | §2.5（hub 图例无 running） |
| D5 | ✅ 关闭 | §2.5（pages 标题+图例+折叠） |
| D6 | 观察项（lane O 未改，符合 UI-018 建议） | 无队列卡，UI-018 §6 已登记 |
| D7 | 观察项（与先例一致） | `policy-intents-list` 紧邻无 `pagesize-note` |
| D8 | ✅ 关闭（O1 待追认） | §2.4（§9 total 1 → 0） |

---

## 3. B —— 批次回归（独立抽验）

### 3.1 B① 策略意图队列（R25）—— 通过

`active.json` 全程用 `arc afs exec … .actions/read` 取**原始文本**算 sha256；意图记录用同一入口读回（**不看 toast**）。

| 步骤 | 命令 | 原始结果 |
| --- | --- | --- |
| 基线 | read `economy/policies/active.json` | sha256 `3bf83038ede7…`；`creator 0.8 / hub 0.15 / protocol 0.05 / version v1 / createdAt 2026-09-23T11:07:49.535Z` |
| 点预设（浏览器） | `node /tmp/qa/policyclick.mjs --label "0.70 / 0.25 / 0.05" --mode confirm` | `clicked:policy-…-action-4`；对话框 `Apply this split?` → `confirmed:0.70 / 0.25 / 0.05:aup-alert-btn primary` |
| 队列 +1（AFS） | list `config/policy-intents` | 新记录 `2026-09-29T07:04:30.833Z.json`：`{action: preset, payload:{0.7,0.25,0.05}, status: pending}` |
| worker 前逐字节不变 | read `active.json` | sha256 仍 `3bf83038ede7…` ✅（页面只入队） |
| `policy apply` | `node scripts/arcblog-economy.mjs policy apply` | `applied: 1`；`changed:["creator","hub","updatedAt"]`；`statusHistory:["pending","running","applied"]`；message「version, createdAt and every unnamed field are unchanged」 |
| 字段真变 + version/createdAt 不动 | read `active.json` | `creator 0.7 / hub 0.25 / protocol 0.05`；`version v1`、`createdAt 2026-09-23T11:07:49.535Z` **未动** ✅；sha 变为 `3207114cf224…` |
| 重复 = noop | 再点同一预设 → `policy apply` | `status: noop`、`changed: []`、`statusHistory:["pending","running","noop"]`；`active.json` sha **不变** `3207114cf224…` ✅ |
| 负例 rejected | `policy request --action preset --creator 0.5 --hub 0.5 --protocol 0.5` → `policy apply` | `status: rejected`、`changed: []`；message「shares must sum to 1 (got 1.5000) — no data changed」；`active.json` sha **不变** ✅ |
| 还原 | 点 `0.80 / 0.15 / 0.05` → `policy apply` | `applied`；`creator 0.8 / hub 0.15 / protocol 0.05`、`version v1`、`createdAt` 不变 ✅（`updatedAt` 变为 07:06:22，写入时戳不可避免） |
| guest 403 | `POST /api/afs/rpc {type:list}` 无 cookie | `config/policy-intents` → **403** `role 'guest' is below readRole 'admin'`；`config/page-intents` / `config/hub-intents` / `config` 同；正对照 `economy/policies` → **200**；guest 写 → **401** |
| 清理 | `arc afs exec … .actions/delete` ×4 | `config/policy-intents` 回基线 **4** 条、id 逐条一致 |

**判定：B① 通过（含负例、幂等、越权三面）。**

### 3.2 B② `?page=pages` 按钮 + `arcblog-pages.mjs queue|apply` 真移动 —— 通过

| 步骤 | 原始结果 |
| --- | --- |
| 造测试页 | `arcblog-pages.mjs create --slug qa-r28-b2-page --title "QA R28 B2 Page" --body-file /tmp/qa/page.md --online` → `page-create`；`pages/qa-r28-b2-page.json` 存在、`page-drafts/…` `NOT_FOUND` |
| 点行内 `Take offline` + 确认 | `clicked:pages-published-list-row-1-action-3`；列表 `pages-intent-list` 0 → **1**，行文案 `qa-r28-b2-page · offline · pending`；`pages-published-list` 仍 `total=1` |
| 队列记录（AFS） | `config/page-intents/2026-09-29T07:07:44.485Z.json` = `{action: offline, slug, status: pending}`；公开记录 sha `ba6a3b1e93ec…` **未变** |
| `queue`（只读） | `count 1`、`target qa-r28-b2-page`、`status pending` |
| `apply` | `applied: 1`；`fromStatus online → toStatus offline`；`changed:["status","updatedAt","version"]`；message「moved … pages -> page-drafts (version 1 -> 2)」 |
| 移动结果（AFS） | `pages/qa-r28-b2-page.json` → **NOT_FOUND**；`page-drafts/qa-r28-b2-page.json` **存在**且 `body` 含 `QA-R28-B2-BODY-7f31` ✅ |
| 反向 `Bring online` + apply | `applied`；`offline → online`（version 2 → 3）；公开记录恢复、body 标记仍在 ✅；`page-drafts/…` → **NOT_FOUND** ✅ |
| 清理 | `offline` + `delete` → `page-delete ok`；`pages 0 / page-drafts 0 / config/page-intents 0` ✅ |
| 定向 live | `node --test --test-concurrency=1 scripts/arcblog-pages.test.mjs` → **tests 10 / pass 10 / fail 0**（exit 0，1m21s） |

**判定：B② 通过。**

### 3.3 B③ 角色卡五态 / zh 标签 / withheld 诚实 / 0 地址输入 —— 通过

| 断言 | 实测 |
| --- | --- |
| 五态与 `scripts/lib/roles.mjs` **逐字同源** | `STAKE_STATES = ['none','acquired','staked','revoking','claimable']`（roles.mjs:40）；页面文本 `none → acquired → staked → revoking → claimable`，命中 **5/5**（en/zh × 2 视口） |
| zh 标签中文、en 不变 | zh 角色卡 CJK 字符 **1103**、标签如「基本角色·生命周期状态 / 能力已授予 / 扣留原因」；en 角色卡 CJK **0** |
| 取值与记录一致（不撒谎） | 刷新后页面 KV vs `arcblog-roles.mjs status --json`：`basic none/granted/no/no` + reason「basic capability is implicit for every instance」；`studio claimable/withheld/yes/yes` + reason「stake state is "claimable"; chain verification is not wired yet (fail closed, spec §115)」；`hub acquired/withheld/yes/yes` + 同族 reason —— **逐条相同** |
| withheld 说明不撒谎 | 卡内常驻「能力已授予的角色没有被扣留的东西——`basic` 那行的 `reason` 说明的是『为什么它是隐式授予』，不是『为什么被扣留』」+「记录里残留的 assetId **不**代表拥有资产」+`chainVerification false` 可见；实测 `withheldCapabilities=[]`、`effectiveCapabilities=[blog.read,blog.write,blog.publish]`，页面未把 `(none)` 说成缺失（术语表常驻） |
| **0 个地址 / 网络 input** | `input,select,textarea` 中 name/label/placeholder/aria 匹配 `address|network|addr|collection|host|token` 的 = **0**（en/zh × 2 视口）；页面可见 input 仅 3 个通用设置的 `eValue`（text + select×2），另 3 个 `type=hidden` 的 `sPath` |

**判定：B③ 通过。**

### 3.4 B④ hub 关系行 —— 通过（4 组视口）

**命令**：`probe.mjs --pages hub … --expand hub`（`hub-relations-list`，5 行/组）

| 视口/语言 | 行数 | 行 `over` | 行内溢出元素 | 动作右端 / 行右端 | flushDelta |
| --- | ---: | ---: | ---: | --- | ---: |
| 1803×908 en / zh | 5 / 5 | 0 | [] / [] | 1756 / 1756 | **0** |
| 1512×765 en / zh | 5 / 5 | 0 | [] / [] | 1465 / 1465 | **0** |

（整页 `deOver=0`、`>R/<L=0`、卡相交 0。）

**判定：B④ 通过。**

### 3.5 B⑤ ui-budget 确定性 + `--write-baseline` 幂等 —— 通过

| 断言 | 命令 | 结果 |
| --- | --- | --- |
| 两次同 sha256 | `node scripts/arcblog-ui-budget.mjs --json` ×2 | 两次均 exit 1（ratchet）；sha256 **`d964e4780a103bf12b4c00525cb483331ed56a0a7b0ca5ca52f38f0ad010aff0`** 两次相同、`cmp` 一致 |
| `--write-baseline` 幂等 | 备份后连跑两次 | H1 = H2 = `ba07514133b665f7423042615ce2667d9e5e2ae3ae5a2cc8684ebef0b8acc566`；第二次输出 **`(no metric changed)`** |
| 还原自证 | `cp` 备份 + sha256 | 还原后 `1a664fd4b8b720168b2ca06cd1a1cf51536f8431442abb1734199f7433376a24`（= 原值），`git status scripts/ui-budget-baseline.json` 空 |

⚠️ 该段是**一次性对照实验**：QA 写范围不含 `scripts/**`，跑前备份、跑后按字节还原（还原 sha 与跑前一致）。重录后的对照结果（`npm test` **55/55**）见 §4.2 / BUG-080。

**判定：B⑤ 通过；同时证明快层红灯的**唯一**成因是基线陈旧。**

### 3.6 B⑥ 7 个 CLI 的 `--help` 与未知 flag —— **部分不通过**

对象 = R28 lane M 改动的 7 个 CLI（`git diff --stat -- scripts/` 逐文件确认）：

| CLI | `--help` exit | 首行 = 统一 flag 契约 | 触发业务？ | `--nope` exit | `--nope` code |
| --- | ---: | --- | --- | ---: | --- |
| arcblog-chain-worker | 0 | ✅ | **否**（无 action、无 JSON 业务输出） | 1 | ❌ **`RUNTIME_ERROR` 裸栈** |
| arcblog-console-nav | 0 | ✅ | 否（打印用法，未写页面） | 1 | `VALIDATION` ✅ |
| arcblog-daily-report | 0 | ✅ | **否**（无 JSON 报告） | 1 | `VALIDATION` ✅ |
| arcblog-hero-carousel | 0 | ✅ | 否（未改 script.js） | 1 | `VALIDATION` ✅ |
| arcblog-query-posts | 0 | ✅ | **否**（未查询；帮助里唯一的 `{` 是说明文字） | 1 | `VALIDATION` ✅ |
| arcblog-rss | 0 | ✅ | **否**（无 `<?xml`） | 1 | `VALIDATION` ✅ |
| arcblog-ui-budget | 0 | ✅ | 否（未写基线） | 1 | `VALIDATION` ✅ |

* **7/7 `--help` exit 0 且不触发业务；未知 flag 6/7 满足「exit 1 + VALIDATION」**。`chain-worker` 违反 → **BUG-082（P2）**。
* 附带发现（**BUG-081 P1**）：`arcblog-chain-worker.mjs` **无参数**时默认执行 `run`（认领并签名链意图）——本会话按 B⑥ 顺带探针时真的执行了一次，详见 §6。

**判定：B⑥ 部分不通过（1 条 CLI 错误码不合契约 + 1 条既有 fail-open）。**

### 3.7 B⑦ 定向 live（串行、持锁）—— 通过

命令：`for f in arcblog-roles-settings arcblog-economy arcblog-pages; do node --test --test-concurrency=1 scripts/$f.test.mjs; done`（单进程串行；`.gate-lock` 全程在）

| 文件 | 结果 | 耗时 | exit |
| --- | --- | --- | ---: |
| `scripts/arcblog-roles-settings.test.mjs` | **tests 6 / pass 6 / fail 0** | < 1 s | 0 |
| `scripts/arcblog-economy.test.mjs` | **tests 52 / pass 52 / fail 0** | ~18.8 min（15:09:29→15:28:18） | 0 |
| `scripts/arcblog-pages.test.mjs` | **tests 10 / pass 10 / fail 0** | ~1.4 min（15:28:18→15:29:39） | 0 |

* 全部通过后核对实例状态：`policy active.json` 回 `0.8/0.15/0.05 / v1 / createdAt 2026-09-23…`；`roles status` 与跑前一致（studio `claimable`、hub `acquired`、basic `none`）；`pages 0 / page-drafts 0 / page-intents 0`。
* ⚠️ 直接 `node --test` **不触发** live tier 的收尾清理（清理只挂在 `run-tests.mjs live` 上）⇒ 经济套件的测试记录留在实例里（见 §4.5 残留说明）。

**判定：B⑦ 通过。**

---

## 4. C —— 门与红线

### 4.1 门（原始输出）

```text
$ arc dsl validate --json            → exit 0；{"ok": true, "issues": []}
$ arc dsl generate --check           → exit 0；Would generate 0 file(s) (dry-run) — nothing to change
$ node scripts/arcblog-console-nav.mjs --check
                                     → exit 0；{"ok": true, "action": "check", "pages": 21}
$ diff -r .aup dist/.aup             → exit 0（无输出）
$ diff -r .web dist/.web             → exit 0（无输出）
$ node scripts/arcblog-dist-secrets.mjs --check
                                     → exit 0；{"ok": true, "files": [], "privateKeyFiles": [], "manifestEntries": []}
$ arc dsl lint --json                → 89 条 unreferenced_explicit_id、dead_locale_keys = 0
```

### 4.2 `npm test`（快层）—— **红**

```text
$ npm test
ℹ tests 55
ℹ pass 54
ℹ fail 1
✖ ratchet: no page is worse than scripts/ui-budget-baseline.json
  pages.ctrl: 9 -> 11 / pages.styles: 20 -> 23 / pages.i18n: 33 -> 38 / pages.tech: 3 -> 5
  hub.styles: 8 -> 15 / hub.i18n: 25 -> 26 / general.tech: 15 -> 17
tests failed        exit=1
```

* **tests 55 ≥ 基线 55**；唯一 fail = ratchet（`stale: ["pages","hub","policy","general"]`、`drift: []`）。
* 对照：`--write-baseline` 后 `npm test` = **tests 55 / pass 55 / fail 0**（随后基线按字节还原）⇒ 红灯**只是基线未随 R28 合法改动重录**，不是代码/测试错。
* ⇒ **新增 BUG-080（P1）**：交付态门禁红；重录基线在 Dev/Lead 写范围内（QA 不写 `scripts/**`）。

### 4.3 21 页 × {en,zh} 回归 —— 通过

命令：`probe.mjs --pages <21 页> --locales en,zh --viewports 1803x908 --out /tmp/qa/matrix21.json`（42 组）+ `active.mjs`（42 组，逐元素普查 `[data-active="true"]`）。

| 断言 | 结果 |
| --- | --- |
| 每页**恰 1 个导航 active**（侧栏内、`aria-current="page"`、accent 淡底 `rgba(42,110,0,0.08)`） | **21/21 × {en,zh} = 42/42** ✅ |
| `SESSION INIT FAILED` / `AUP INCLUDE REQUIRES RESOLVEINCLUDE` | **0**（42/42 false）✅ |
| `documentElement` 横向溢出 | **0**（42/42）✅ |
| 内容区真实元素溢出 | 0（42/42）；仅保留 2 个全出血结构性元素 ✅ |
| **口径说明** | 4 页（`posts / compose / media / diagnostics`）另各含 **2 个平台 `aup-tab` / `aup-tab-panel` 元素**也带 `data-active="true"`（平台 tab 原语的当前页标记）。它们**不在侧栏内**、无 `aria-current="page"`；按「导航 active」口径 21 页仍各恰 1。此为**既有平台行为**，非本批回归，登记为观察项 O3 |

### 4.4 红线：零链写 / 零资金

| 断言 | 证据 |
| --- | --- |
| `config/chain-intents/pending.json` **仍在** | sha256 **`fef80b4f026e75217149894f8b8de49113205f99bc07f6323019339703497ea6`**（与前几轮报告记录的前缀一致），全文未变 |
| 无新链上交易 | `node/factories.json` 全文 `txHash|transactionHash` 命中 **0**；无新交易哈希 |
| 未跑禁用链命令 | 未执行 `space sync --mirror` / `space rm` / `chain-worker watch`；`order verify` 属 CLI 自带的 **READ_ONLY_METHODS** 白名单（getTx 只读） |
| ⚠️ **例外（QA 流程事故）** | 本会话一次**无参数** `node scripts/arcblog-chain-worker.mjs` 被默认成 `run`，认领了 `config/chain-intents/intent-mujkccy6-r1nd.json`（`pending → rejected`，链 host 拒绝：`Invalid itx … Expected >=1 but received 0`；**无 `result`、无 tx hash、无资金**）。**全量披露 + 立 BUG-081**，见 §6 |

### 4.5 实例探针记录清理自证

| 目录 | 探针前 | 探针后 | 说明 |
| --- | --- | --- | --- |
| `config/policy-intents` | 4 条（基线 id 列表已记） | **4 条，id 逐条相同** | B① 创建的 4 条（`07:04:30.833Z` / `07:05:26.534Z` / `policy-intent-mumc1nnju4me` / `07:06:22.988Z`）逐条 `/.actions/delete` |
| `config/page-intents` | 0 | **0** | B② 2 条逐条删除 |
| `pages` / `page-drafts` | 0 / 0 | **0 / 0** | B② 测试页 `qa-r28-b2-page` 已 `offline` + `delete` |
| `config/chain-intents` | 6 条 | **6 条**（其中 `intent-mujkccy6-r1nd` 被 QA 事故改写为 `rejected`） | §6；**未回滚**（QA 无权重写链意图记录） |
| `docs/team/.gate-lock` + `dist` 镜像 | 本会话创建 | **已删 / `dist/docs/team/.gate-lock` 不存在** | §7 自证 |
| 经济套件残渣 | — | **未扫**（`arcblog-clean.mjs` dry run `found: 620 / removed: 0`） | 定向单跑不带 live tier 收尾；`--confirm` 会删掉 **620** 条共享实例历史残渣（含其它证据引用的 84 条 products / 46 条 drafts 等），**超出本次 QA 授权**，留 Lead 决定（§5 U7） |

---

## 5. 受限未验证清单（如实登记，**未验证 ≠ 通过**）

| # | 项 | 原因 | 怎样才能验证 |
| --- | --- | --- | --- |
| U1 | `hub` 队列行内 `Clear` 的**运行期**圆角与行为 | `hub-intents` `total=0`，行不渲染 | 入队一条 hub 意图后复测（写共享实例） |
| U2 | `hub` 行内 `Approve` / `Terminate` 是否真写成功（§4.9 U1） | 需真点击 → 写 `hub/registrations`；不在本批任务面 | 定向点击探针 + AFS 前后 sha256 |
| U3 | `chain-worker` 的真实签名路径（`--adapter ocap` 成功态） | 本机无 mnemonic/真实链资金；仅观察到 host 侧拒绝 | 有资金与密钥的 operator 环境 |
| U4 | `?page=general` @1512×765 的 `aup-kv-label` 溢出是否存在**页面级**后果 | 只在「同标签页二次进入且记录已解析」时出现 10px；已立 BUG-083（P3）、deOver 仍 0 | UI 探针 + 标准裁定（改标签或平台列宽） |
| U5 | O1（D8 变体 vs 设计 §2.6 框架内切换） | 标准口径裁定，不是运行期测试 | Lead 追认（`target=_blank` 或 `-> page factory`） |
| U6 | 全量 `npm run test:live` | **用户裁定禁止**（~21 min、写共享实例） | 只在人工点名时跑 |
| U7 | `arcblog-clean.mjs --confirm` 的 620 条残渣清扫 | 会删除其它证据引用的共享基线记录（84 products / 46 drafts …），超出 QA 授权 | Lead 决定是否清、何时清 |

---

## 6. QA 流程事故全量披露：一次意外的 `chain-worker` 裸调用

**发生了什么**：B⑥ 探针在比较「无参数是否触发业务」时执行了 `node scripts/arcblog-chain-worker.mjs`（无子命令）。该 CLI 的 `main()` 是 `const command = argv[0] ?? 'run'` ⇒ 默认进入 `run`：认领了 `config/chain-intents/intent-mujkccy6-r1nd.json`（此前 `pending`），尝试用当前 `ocap/beta` 适配器签名，并把结果写回该记录。

**后果（原始证据）**：

```text
$ node scripts/arcblog-chain-worker.mjs
{ "ok": true, "action": "intent-run", "processed": [ … ] }      exit=0

$ arc afs exec … read config/chain-intents/intent-mujkccy6-r1nd.json
{"status":"rejected","startedAt":"2026-09-29T06:58:50.100Z","finishedAt":"2026-09-29T06:58:55.386Z",
 "error":"RUNTIME_ERROR GraphQLError: Invalid itx: \"variablesList.value\" Invalid length: Expected >=1 but received 0"}
```

**边界**：链 host 侧拒绝 ⇒ **无 `result`、无 tx hash、无资金**；`pending.json`（sha `fef80b4f…`）与 `node/factories.json`（txHash 0）均未受影响。被改写的是链意图队列里**一条**既有记录（`pending → rejected`，终态可审计）；QA **不回滚**（无权重写链意图记录），在此如实登记。

**由此产出的缺陷**：**BUG-081（P1）**「无参数默认 `run` 是 fail-open」；**BUG-082（P2）**「未知 flag 的 `VALIDATION` 契约未满足」。
**流程改进（QA 自省）**：对会写实例/链的 CLI，**永远不要**做「不带参数的裸调用」探针；本批唯一的实例/链副作用来自这一条。

---

## 7. 锁与镜像清理自证

```text
$ ls -la docs/team/.gate-lock          # 会话中（14:57 创建）
-rw-------  1 shenxiang staff 63 … docs/team/.gate-lock
$ cat docs/team/.gate-lock
owner: QA (batch-end QA R25-R28)
started: 2026-09-29 14:57 CST
$ ls dist/docs/team/.gate-lock
ls: dist/docs/team/.gate-lock: No such file or directory
# 报告写盘后：
$ rm docs/team/.gate-lock && ls docs/team/.gate-lock
ls: docs/team/.gate-lock: No such file or directory      ← 见末行自证
$ ls dist/docs/team/.gate-lock
ls: dist/docs/team/.gate-lock: No such file or directory
```

> ⚠️ **交接提醒**：本次 QA 的 `docs/team/test-reports/round-28-batch-qa.md` 与 `BUG-080..083` 写盘**晚于**最后一次 `arc blocklet build`（14:54:36）⇒ `dist/docs/team/**` **不含**这些文件（`dist/.aup` / `dist/.web` 与源码一致，已由 §4.1 的 `diff -r` 证明）。Lead 提交前须**再跑一次 `npm run build`**（先按 §5 U7 决定残渣），并按 R22/R24 先例确认 `dist/docs/team/.gate-lock` 不存在、**禁止 `git add -A`**。

---

## 8. 新增 BUG 列表

| 编号 | 级别 | 一句话 | 阻断？ |
| --- | --- | --- | --- |
| [BUG-080](../bugs/BUG-080-fast-tier-red-ui-budget-baseline-stale.md) | **P1** | `npm test` 红：ui-budget ratchet 基线未随 R28 的 `.aup` 改动重录（7 项回归；重录后 55/55） | **是** |
| [BUG-081](../bugs/BUG-081-chain-worker-no-args-defaults-to-run.md) | **P1** | `chain-worker` 无参数默认 `run`（隐式签名/消费 pending 意图，fail-open；本次会话真实触发，零资金） | **是**（既有，需裁决） |
| [BUG-082](../bugs/BUG-082-chain-worker-unknown-flag-raw-stack.md) | P2 | `chain-worker` 未知 flag → exit 1 但裸 `RUNTIME_ERROR` 栈，非 `VALIDATION` | 否 |
| [BUG-083](../bugs/BUG-083-general-kv-label-overflow-claimableat.md) | P3 | `?page=general` @1512 `studio.lifecycle.claimableAt` 标签溢出 10px（既有、条件可复现、不破页面） | 否 |

**观察项（不立 BUG）**：O1 D8 变体需 Lead 追认标准 §2.6；O2 `pages` 的 `offline-hint` 有动词 "watch keeps running"（非状态词）；O3 平台 `aup-tab`/`aup-tab-panel` 也带 `data-active="true"`（导航 active 口径仍 21/21 恰 1）；O4 D6/D7 与 UI-018 建议一致、不改。

---

## 9. 复现命令全集

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
# 门
arc dsl validate --json && arc dsl generate --check && arc dsl lint --json
npm test                                                  # → 55/54/1（BUG-080）
node scripts/arcblog-console-nav.mjs --check              # → pages 21
diff -r .aup dist/.aup && diff -r .web dist/.web && node scripts/arcblog-dist-secrets.mjs --check

# A：4 页 × {en,zh} × {1803,1512}（含 general 冷载/刷新、hub/pages 展开）
node /tmp/qa/probe.mjs --pages general,policy,hub,pages --locales en,zh \
     --viewports 1803x908,1512x765 --reload --expand hub,pages --out /tmp/qa/panels.json
# A③：6 页 action 圆角 + B④ hub 关系行
node /tmp/qa/probe.mjs --pages hub,general,policy,pages,dashboard,factory --locales en,zh \
     --viewports 1803x908,1512x765 --expand hub --out /tmp/qa/panels2.json
# C：21 页 active / session
node /tmp/qa/probe.mjs --pages dashboard,posts,pages,compose,heroes,categories,tags,seo,feeds,appearance,operations,hub,media,agents,orders,policy,access,ledger,factory,general,diagnostics --locales en,zh --viewports 1803x908 --out /tmp/qa/matrix21.json
node /tmp/qa/active.mjs --pages <同上 21 页> --locale en   # / zh

# B①（浏览器点击 + AFS 复核；先取 docs/team/.gate-lock）
node /tmp/qa/policyclick.mjs --label "0.70 / 0.25 / 0.05" --mode confirm
arc afs exec /blocklets/arcblog/.actions/list  --args '{"path":"/instance/app/arcblog/config/policy-intents"}' --json
arc afs exec /blocklets/arcblog/.actions/read  --args '{"path":"/instance/app/arcblog/economy/policies/active.json"}' --json
node scripts/arcblog-economy.mjs policy apply

# B②（页面往返；先取锁）
node scripts/arcblog-pages.mjs create --slug qa-r28-b2-page --title "QA R28 B2 Page" --body-file /tmp/qa/page.md --online
node /tmp/qa/clickbtn.mjs --page pages --label "Take offline" --rowmatch "qa-r28-b2-page" --mode confirm
node scripts/arcblog-pages.mjs queue && node scripts/arcblog-pages.mjs apply

# B⑦ 定向 live（串行、持锁；跑完删锁）
node --test --test-concurrency=1 scripts/arcblog-roles-settings.test.mjs
node --test --test-concurrency=1 scripts/arcblog-economy.test.mjs
node --test --test-concurrency=1 scripts/arcblog-pages.test.mjs

# B⑤ / B⑥
node scripts/arcblog-ui-budget.mjs --json
for f in arcblog-chain-worker arcblog-console-nav arcblog-daily-report arcblog-hero-carousel arcblog-query-posts arcblog-rss arcblog-ui-budget; do node scripts/$f.mjs --help >/dev/null; echo "$f --help exit=$?"; node scripts/$f.mjs --nope >/dev/null 2>/tmp/e; echo "$f --nope exit=$? $(grep -o VALIDATION /tmp/e|head -1)"; done
```

---

## 10. 放行结论

**不放行（VERDICT=fail）。** 阻断项 **2**：

1. **BUG-080（P1）——`npm test` 快层红。** 放行门槛要求快层全绿；当前 55/54/1。收口动作（Dev/Lead，写范围 `scripts/ui-budget-baseline.json`）：`node scripts/arcblog-ui-budget.mjs --write-baseline` 后在干净工作区复跑 `npm test`（QA 已实测届时 55/55）。
2. **BUG-081（P1）——`chain-worker` 无参数默认 `run`（fail-open）。** 既有行为，但属「无显式命令即签名」的安全缺陷，且本会话已被它真实消耗一条 pending 意图；需 PM/Lead 明确裁决（本轮修 / 下一轮修 / 不修并记录）后方可放行。

非阻断但需登记：BUG-082（P2，`chain-worker` 未知 flag 错误码面）、BUG-083（P3，general @1512 标签 10px 溢出）、O1（D8 变体标准追认）、O3（平台 tab 的 `data-active` 口径）。

**已独立确认关闭（A 组）**：D1、D2、D3、D4、D5、D8 —— 本批的 6 项修复**运行时全部达成**。
**已独立确认通过（B 组）**：B①、B②、B③、B④、B⑤、B⑦；B⑥ 部分不通过（1/7 CLI 错误码 + 1 条 fail-open）。

VERDICT=fail, BLOCKING=2
