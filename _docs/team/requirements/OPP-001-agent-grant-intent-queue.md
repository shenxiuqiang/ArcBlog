# OPP-001 — 把「意图队列」范式推广到 Agent 授权签发/撤销

> 机会 · 证据 · 假设 · 最小切片 · 成本粗估 · 依赖 ｜ 提出：审查轮（`task-1`，2026-09-29） ｜ 状态：**机会候选**（未被裁决，未建任务）

## 机会

spec §15.8「Grants」把"信任一个 Agent"定义成显式动作：**签发**（选能力 + TTL）、**撤销**（立即生效）、**高风险能力二次确认**、`agent.admin` 不可授予。现在这些动作在控制台**一个也做不到**：`?page=agents` 是只读页，只给两行可复制命令（`.aup/pages/ops/agents.aup:194-200`；`grep -c '\.actions/write'` 实测 **0**）。

而同仓库已经有**五个**解决"页面算不出派生 id、写不了目标记录"的标准范式：页面只写一条意图到 `config/<x>-intents/<id>.json`，本机 worker 用既有 CLI 落库并回写终态（`pending|running|applied|rejected|noop`，单一词表 `scripts/lib/intents.mjs`）——`categories.aup:229-230`、`media.aup:184`（`arcblog-media.mjs --help` 的 `request/queue/apply` 明写该设计）、`pages.aup:189/211`、`policy.aup`（`config/policy-intents`）、`hub.aup`（`config/hub-intents`）。

把同一个范式套到 Agent 授权上，"AI 能对我的节点做什么"就从"要开 shell 才能改"变成"在后台显式、可回写、可审计地改"——这正是 §15.8 的达成标准。

## 证据

- `checklist:125` 现写的降级理由是「平台无哈希原语，无法在页面寻址 `config/agent-grants/<didHash>.json`」——**该理由已被同仓范式推翻**：页面不需要知道 hash，它只写 `config/agent-grant-intents/<ISO 时间>.json`，`didHash` 由 worker 计算（与 `hub/registrations` 的派生 id 完全同构，checklist :118 已用该思路）。
- 实测：`.aup/pages/ops/agents.aup` 的 `\.actions/write` = 0、`exec:` = 0；工具目录/策略全是静态 `key-value-list`（`:178-192`），没有任何开关。
- CLI 侧能力齐备：`node scripts/arcblog-agent.mjs --help` → `authorize --agent <did> --capability agent.write[,agent.publish] [--ttl <minutes>]`、`revoke --agent <did>`、`grants`；且 `agent.admin` 已被实现侧禁止（spec §130）。
- spec 承诺：§15.8 Grants 功能清单（签发 / 撤销 / 二次确认）+ 达成标准（"每一条授权都有明确过期时间…撤销立即生效…高风险能力签发时必须二次确认"）。

## 假设

> 我们相信**让授权签发/撤销在 `?page=agents` 上按钮化（意图队列 + worker）**，会让**节点运营者**的**"授权一个 Agent"完成率**从"必须离开后台、会敲 CLI 才能完成"变成"页面上 2 次点击 + 一次终态回写"，并让 §15.8 的"默认只读、逐项显式开启"有一个可点的落点。

## 最小切片

只做 **授权（签发 + 撤销）一条队列**，不动工具目录：

1. `scripts/arcblog-agent.mjs` 增 `request --action authorize|revoke …`、`queue`、`apply`、`watch`（复用 `scripts/lib/intents.mjs` 词表与 `<id>.json` 命名规则）；
2. `?page=agents` 的 grant 卡（`:194-200`）加两个动作：`authorize` 表单（能力多选 + TTL）与行内 `revoke`，高风险能力用平台 `confirm={…}` 做二次确认；
3. 验收：worker 前 `config/agent-grants/` 逐字节不变 → worker 后新记录出现（`expiresAt` 正确）→ 撤销后记录消失/失效；非法能力（`agent.admin`）页面就不可选 + worker fail-closed；guest 读队列 403。

## 成本粗估

中等偏低：1 个 CLI 子命令族（照抄 `arcblog-media.mjs` 的 `request/queue/apply/watch` 骨架）+ 1 页的两个动作 + 1 份 REQ 的验收脚本。无 schema 改动、无 `blocklet.yaml` 改动、无链写。

## 依赖

- 需要 Lead 采纳（`bootstrap.md` §11.2）并建 REQ/任务；若采纳，需与 REQ-041（同页 `.aup` 写入面）串行，避免同文件并发写。
- 读 `docs/arc-contracts.md` §29.2/§29.4（写入面与"toast 不是证据"）、`scripts/lib/intents.mjs` 的既有契约。
- 若 Lead 决定不做：**请把 `checklist:125` 的降级理由改述**（"未实现"而非"平台不可表达"），否则是用一个已被推翻的技术理由关闭一个可做的需求。
