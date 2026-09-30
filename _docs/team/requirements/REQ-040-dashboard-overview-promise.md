# REQ-040 — `?page=dashboard` 兑现 §15.3：节点/网络状态 + 异常提醒（一次点击直达）

> `REQ 编号` REQ-040 ｜ `对应 spec` §15.3（概览 Dashboard）、§15.6/§110（Node Health）、§15.9（角色与能力） ｜ `checklist 行` **:132**（Dashboard 网络概览与异常提醒，正文 ✅ → 建议 🟡）、**:108**（概览 Dashboard，✅） ｜ `优先级` **P1** ｜ `提出轮次` 审查轮（`task-1`，2026-09-29，R29 之后） ｜ `负责角色` Dev（`.aup/**`） ｜ `状态` **草案（待 Lead 裁决，见 REVIEW §5-裁决点 1）**

## 1. 背景

`docs/ArcBlog-product-technical-spec.md` §15.3 把 Dashboard 定义为"三十秒内回答节点健康吗？内容怎么样？钱到账了吗？"，功能清单包含**节点状态卡、角色状态卡、内容概览、网络概览（按角色）、经济概览、Agent 状态、异常提醒条**，达成标准是"任何异常（同步失败、结算失败、授权过期）都能在 30 秒内被发现，并且一次点击直达处理页面；Dashboard 不产生操作闭环，只做概览与跳转"。

R24 曾把「网络卡 + 异常提醒条」实现并 QA 验证（checklist :132 正文，`task-100`/REQ-031 ③）。但 **2026-09-29 13:19 的 `84f5e1e`（*feat(ui): re-apply dashboard refactor after external rollback*）把它们整块删除**：该提交对 `.aup/pages/admin/dashboard.aup` 是 60 insertions / 135 deletions，删掉了 `network`/`net-*`/`alerts`/`alerts-*`/`node-hint` 等 i18n 键、`propBind={netHealth, netDiscovery}`、`dashboard-orders-list`、`dashboard-agents-list`。`84f5e1e^` 的文件含 3 个 `afs-list` + 3 处 `propBind` + 14 处 network/alerts 命中；HEAD 只有 2 个 `afs-list`（`:172` / `:193`）、0 处 `propBind`，`node scripts/arcblog-ui-budget.mjs --json` 的 `dashboard.i18n` = 16（无 network / hub / alert 语义键），`dist/.aup/pages/admin/dashboard.aup` 里 `grep -c 'network\|alerts\|node/health'` = 0。

其后 `git log --oneline HEAD -- .aup/pages/admin/dashboard.aup` 只有 `a2d1947`（仅新增空态指引），即**该回退没有被任何后续提交恢复，也没有任何轮次日志/backlog/checklist 记载这次功能移除**——checklist :132 / :108 至今记 ✅。

结果：控制台的落地页只回答"我有什么内容要处理"（这是好事，属 UI-016 的 P2 概览目标），但"巡检"半边整体消失，而 §15.3 的达成标准仍写在 spec 里；`?page=operations` 只读展示 health/discovery/hubs（`operations.aup:138-152`，`ctrl=0`），**没有任何告警块**，因此"异常一次点击直达"当前在控制台**没有任何落点**。

## 2. 范围

**做**

1. 在 `?page=dashboard` 恢复/落位一个**只读的"节点与网络状态"块**（取值来源写明：`node/health.json` + `node/discovery.json`），至少包含 `hubs.total / fresh / offline`、Node DID、roles、endpoint。
2. 恢复/落位一个**"异常提醒"条**：以"点名 + 一次点击直达处理页"的形式给出至少三个入口——Hub 同步 → `?page=hub`、结算/账本 → `?page=ledger`、授权/Agent → `?page=agents`（具体归属页可在实现时按 spec §15.3 调整）。
3. 计算口径**只允许引用已算好的记录**（`node/health.json` 的 `hubs` 对象），不做页面侧计数；无数据时渲染平台破折号 / 常驻说明，**绝不伪造 0 或绿灯**。
4. 保留本次 P2 概览的既有职责：待处理草稿（`:172`）、最近已发布（`:193`）、页级空态说明卡（`:149-158`）、页头唯一主操作「写文章」（`:137`）。
5. 若 Lead 选"处置方案 B"（改 spec §15.3 把巡检挪到 `?page=operations`），则本 REQ 的 1–3 条改为落在 `operations` 页，`dashboard` 只保留一条跳转。

**明确不做**

- **不实现任何计数/比较**：平台表达式语言没有 `length` / 比较原语（`docs/arc-contracts.md` §21）——不做"3 个 Hub 失败"这类页面自算数字。
- **不实现告警的自动推送/轮询**：不做定时任务、不加心跳记录（仓库内不存在心跳记录，`diagnostics.aup:16` 已登记）。
- **不新增任何写路径**：本页不得出现新的 `/.actions/write`；"直达"只用 `action -> page <name>`（本页 `:137`/`:187` 已有范式）。
- **不实现 §15.3 的"经济概览/Agent 状态"更深内容**（订单列表、授权列表曾在该页，归 `?page=orders` / `?page=agents`）；本 REQ 只要求"异常能否被发现 + 能否一键到达"，不把删掉的三张卡整体搬回。
- **不改 spec §15.3 文案**（改产品承诺 = 人类的事，见 REVIEW §5-裁决点 1-B）；**不改链、不碰资金**；不动 `world/**`。

## 3. 验收标准

每条都是可直接执行或可观察的判据。

1. **存在性（可观察）**：登录后在 `?page=dashboard` 能看到"节点与网络状态"块与"异常提醒"块；异常提醒块至少有 3 个可达入口，点击后分别落在 `?page=hub`、`?page=ledger`、`?page=agents`（DOM 断言可用 `aria-current="page"` / URL 的 `page=` 参数）。
2. **取值真实（AFS 逐值一致）**：
   ```bash
   arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/node/health.json"}' --json
   ```
   页面渲染的 `total/fresh/offline` 与该 JSON 的 `hubs` 对象**逐值相等**；页面必须写明取值来源（对照 `dashboard.aup:142-146` 的现成写法）。
3. **不伪造（缺数据场景）**：把 `node/health.json` 的 `hubs` 计数临时改动（或用一个无数据实例）时，页面渲染平台破折号 / "尚无数据"说明，**不得出现 0、也不得出现绿色状态**；复原后逐值回到验收 2。
4. **零新增写路径（可执行）**：
   ```bash
   git diff -- .aup/pages/admin/dashboard.aup | grep -c '/.actions/write'   # 期望 0（且页面全文计数不变）
   grep -c '\.actions/write' .aup/pages/admin/dashboard.aup                 # 期望与改动前相同（当前为 0）
   ```
5. **门（可执行）**：
   ```bash
   arc dsl validate --json          # issues 必须为 []
   npm test                         # 快层不降（以运行时真实计数为准）
   node scripts/arcblog-console-nav.mjs --check   # pages 21
   arc dsl generate --check         # 0 漂移
   npm run build                    # .aup 改动后必跑（build + scrub）
   ```
6. **预算棘轮显式（可执行）**：`node scripts/arcblog-ui-budget.mjs --json` 中 `dashboard` 的七项若因本改动变化，必须**显式重录** `scripts/ui-budget-baseline.json` 并在交付说明里逐项解释新增了什么；`--strict` 不得出现新的超限页（`regressions` 为空）。
7. **零回归（可观察）**：21 页每页恰 1 个 `active=true`、0 个 `SESSION INIT FAILED`；`dashboard` 的草稿列表仍 `pageSize`/`pageSizeOptions` 受控（BUG-063 的缓解不丢）。

## 4. 依赖

- 前置裁决：**REVIEW-console-pm-20260929.md §5-裁决点 1**（A：恢复；B：改 spec → 需人类批准）。
- 已存在的实现可参考：`84f5e1e^:.aup/pages/admin/dashboard.aup`（R24 的 network 卡 + alerts 条原文，可直接取回再按现行 P2 骨架合并）。
- 平台约束（实现前先读）：`docs/arc-contracts.md` §21（无 length/比较原语）、§28.1（`visible` 只吃同步 `$session.*`）、§28.6（`emptyText` 不求值）、§15（`filter` 走索引会陈旧）、§29.4（toast 不是证据）。
- 交付后需要一次登录态验证（QA 或 Lead），因为 guest 探针只能看到门禁卡。
- 若 `.aup` 改动生效：按 `arc-contracts §35` 走 restart + 复挂 + 一条 `/instance` 读。

## 5. 涉及写范围

| 路径 | 说明 |
| ---- | ---- |
| `.aup/pages/admin/dashboard.aup` | 主改动（若选 B，则改为 `.aup/pages/ops/operations.aup`） |
| `.aup/locales/{en,zh}.json`（生成物） | 新增 i18n 键（页级 `dashboard.*`） |
| `.aup/pages/admin/dashboard.json` 等生成物（若存在） | `arc dsl generate` 产物 |
| `dist/**` | **只经 `npm run build`**（不得手改） |
| `scripts/ui-budget-baseline.json` | 仅当预算数字变化时**显式重录**（需在交付说明里逐项解释） |
| `docs/team/.gate-lock` | 临时，跑完删除（含 `dist/` 镜像） |

**不涉及**：`scripts/console-nav.mjs`（页数保持 21）、`world/**`、`blocklet.yaml`、`scripts/arcblog-*.mjs` 的业务语义。

---

## 6. 假设（§10.3）

> 我们相信**把"节点/网络状态 + 异常点名与直达"放回落地页**，会让**节点运营者**的**异常发现时间**从"进 4 个页面各看一遍"降到"打开后台一眼 + 一次点击"，并让 §15.3 的达成标准重新可执行。

## 7. 最小切片（§10.3）

只做两件：① 一个只读状态块（`hubs.total/fresh/offline` + Node DID，`propBind` 两处）；② 一个三入口的异常提醒条（`action -> page`，零写）。**不搬回**订单/授权列表——先验证"异常可发现"，再谈内容厚度。

## 8. 成功指标（可观察，§10.3)

- 路径步数：从"打开 `?page=dashboard`"到"到达任一异常归属页" = **1 次点击**（现状：需要先自己想到该去哪个页，且没有任何提示）。
- 页面可达性：`?page=dashboard` 的 `propBind` 计数 ≥ 2（现状 0），`i18n` 键中出现 network / hub / alert 语义键。
- 取值一致性：验收 2 的 AFS 逐值比对 100% 通过；验收 3 的"缺数据不伪造"通过。
- 零写风险：该页 `/.actions/write` 计数保持 0。

## 9. 不做什么（§10.3，与 §2 呼应）

不做页面侧计数、不做定时任务/心跳、不做推送、不搬回订单与授权列表、不新增写路径、不改 spec 承诺方向、不动链与资金。

## 10. 风险与回退（§10.3）

| 风险 | 处置 |
| ---- | ---- |
| 预算回升触发棘轮红（`dashboard` 的 `cards`/`styles` 曾正好压线 8/8） | 显式重录基线 + 逐项说明（验收 6）；若超 §2.7.2 硬上限，则把状态块收进"高级"（`view mode=tabs`）而不是放弃异常提醒 |
| `propBind` 冷启动首屏不解析（`arc-contracts §21.11`/BUG-036） | 沿用 R24 的诚实写法：平台破折号 + 两段式常驻说明，不伪造 0 |
| 与目标 IA（task-18）冲突 | 本 REQ 不改菜单、不改 `?page=` 名，task-18 只改显示名/归组/顺序，二者可叠加 |
| 该页再次被"简化"回退 | 验收 2/4 是**回归判据**，建议随本 REQ 落一条 fast-tier 断言（`dashboard` 必须存在 network 卡与 ≥3 个直达动作），防止二次静默回退 |
| 涉及资金/链 | **无**：本 REQ 全程只读，零链写零资金 |
