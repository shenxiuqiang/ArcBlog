# BUG-013: `?page=agents` 新增「已声明工具」卡的关闭工具状态 `closed` 未本地化（zh 下仍为英文）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-013 |
| 严重级 | **P2**（i18n 缺失/不一致；不影响功能） |
| 发现轮次 | round-9（**本轮新增**：`.aup/pages/ops/agents.aup` 第 169 行的 `agent-tools-closed` 行是本轮 §15.8 升级新写的） |
| 关联 REQ | REQ-006 §2.1「§15.8 工具清单」（read 9 / write 4 / closed 6 三分类）；判据 `docs/ArcBlog-admin-ui-design.md` §9「i18n：中英文布局都成立」 |
| 状态 | **已修复（R9F，Dev / task-16）· QA 复验通过（2026-09-27T17:3xZ，见 [round-9-reverify.md](../test-reports/round-9-reverify.md) §3-D / §6）** —— 页级新增 `status-closed { en "closed" zh "关闭" }`，6 项改为 `$t(agents.status-closed) · …`，`arc dsl generate --write` 后快层死键门绿 |
| 写范围 | 疑似文件属 Dev（`.aup/pages/ops/agents.aup`）；QA 未改任何源码 |

## 复现命令与最小步骤

```bash
# admin 会话（CDP 9333），同一页只切 locale
QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs 'http://arcblog.localhost:4939/?page=agents&locale=zh' /tmp/qa-r9/dump-text.js
```

## 期望

REQ-006 §2.1 要求工具清单「每个工具含**工具名 + 所需能力 + 可用状态**」；同页 `read`/`write` 两类的状态词已本地化（`可用` / `不可用`，来自 `agents.status-available` / `agents.status-unavailable`）。`closed` 类应与二者同口径。

## 实际

zh locale 下 `closed` 六行 + 图例均为硬编码英文（`.aup/pages/ops/agents.aup:169` 的 `value: "closed · agent.economy"` / `"closed · agent.admin"`）；页级 `i18n {}` 与两个 locale 文件里**都没有** `status-closed` 键。

```text
### ?page=agents&locale=zh（admin，原样摘录）###
只读工具（9）
search_posts / 可用 · agent.read
…
list_studios / 不可用 · agent.read — 本平台版本没有跨节点 Studio 注册表（spec §71 属 POST-MVP 传输）
写工具（4）——需要限时授权
create_draft / 可用 · agent.write
…
关闭工具（6）——永不暴露（spec §130）
get_orders / closed · agent.economy        ← 未本地化
get_settlements / closed · agent.economy
get_sales / closed · agent.economy
settle_payment / closed · agent.admin
change_wallet / closed · agent.admin
change_role / closed · agent.admin
关闭工具永不从 Agent 面执行：…（本句已本地化）

$ grep -c 'status-closed' .aup/pages/ops/agents.aup .aup/locales/en.json .aup/locales/zh.json
.aup/pages/ops/agents.aup:0
.aup/locales/en.json:0
.aup/locales/zh.json:0
```

对照（en）同页为 `available · agent.read` / `unavailable · agent.read` / `closed · agent.economy`——即 en 下 `closed` 与 `available` 同排出现，说明它本应是同一组状态词的一员。

## 证据输出

见上（`node /tmp/qa-r9/dump-text.js` 经 CDP 原样输出；`grep -c 'status-closed'` 三处均 0）。

## 影响范围

- 受影响角色：zh locale 的控制台运营者
- 受影响链路：`?page=agents` 关闭工具分区的状态双编码文字（三分类中恰有 1 类的状态词未翻译）
- 数据后果：无
- 可绕过：是（工具名与 capability 仍可读）

## 疑似文件

- `.aup/pages/ops/agents.aup:169`（`key-value-list agent-tools-closed … value: "closed · agent.economy"` / `"closed · agent.admin"`，共 6 项）
- 同文件 `i18n {}`：已有 `status-available` / `status-unavailable`，缺 `status-closed`
- 对照（本轮同批、已正确本地化）：同页 `read` / `write` 两区的 `$t(agents.status-*)`

## R9F 复验结论（QA，2026-09-27T17:3xZ）— 已修复

独立复验（自跑 CLI + 自跑 CDP 探针，未采信 Dev 自述；原始输出见 [`round-9-reverify.md`](../test-reports/round-9-reverify.md) §3-D）：

```text
$ node scripts/arcblog-agent.mjs tools
{ "ok": true, "count": 19, "defaultClosed": ["settle_payment","change_wallet","change_role"], "closed(6)": get_orders,get_settlements,get_sales,settle_payment,change_wallet,change_role }

$ QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs '…/?page=agents&locale=zh' /tmp/qa-r9f/agents-zh2.js
"关闭工具（6）——永不暴露（spec §130）  get_orders 关闭 · agent.economy  get_settlements 关闭 · agent.economy  get_sales 关闭 · agent.economy
 settle_payment 关闭 · agent.admin  change_wallet 关闭 · agent.admin  change_role 关闭 · agent.admin
 状态：可用 = 当前可执行；不可用 = 已声明但平台无法提供（原因见行内）。 关闭工具永不从 Agent 面执行：…"
closedContexts: [".mjs tools —— 19 个工具（read 9 / write 4 / closed 6）。可重跑 CLI 复核"]   ← 唯一残留 closed 是引文里的机器值
keyLeak: false   rawKeyLeak: false   initFail: false

$ QA_VW=1803 QA_VH=908 node /tmp/qa-cdp2.mjs '…/?page=agents&locale=en' /tmp/qa-r9f/agents-en.js
{ "enClosedCount": 6, "section": "Closed tools (6) — never exposed (spec §130) get_orders closed · agent.economy …" }

$ grep -c 'status-closed' .aup/pages/ops/agents.aup .aup/locales/en.json .aup/locales/zh.json
.aup/pages/ops/agents.aup:2   .aup/locales/en.json:1   .aup/locales/zh.json:1
$ grep -n 'agents.status-closed' .aup/locales/en.json .aup/locales/zh.json
.aup/locales/en.json:520:  "agents.status-closed": "closed"
.aup/locales/zh.json:520:  "agents.status-closed": "关闭"
$ grep -c 'value: "closed ·' .aup/pages/ops/agents.aup
0
```

**结论**：zh 下 6 行状态词为 `关闭 · agent.economy/admin`，与 CLI `closed(6)` **逐项同序**；无 `$t(` 泄漏、无裸 key 渲染；en 下仍为 `closed`；`npm test` 死 locale 键门绿（28/28）。**已修复，放行。**
