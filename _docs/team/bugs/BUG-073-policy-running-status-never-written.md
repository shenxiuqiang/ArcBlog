# BUG-073: `policy apply` 从不写 `running` 中间态，而页面图例与 REQ-032 §2.1 都把 `running` 描述成「worker 已认领」——一个永远不会出现的状态

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-073 |
| 严重级 | **P3**（规格/文案一致性：无功能中断——`pending` 在崩溃后仍会被下一轮 `apply` 重新拾取；但 REQ 明文要求的 `running` 步骤未实现，图例因此描述了一个不可达状态） |
| 发现轮次 | round-25（QA `task-108` 独立验证 REQ-032 A 组时发现） |
| 关联 REQ | [REQ-032](../requirements/REQ-032-policy-intent-queue.md) §2.1 A.2「读 `<id>.json` → **标 `running`** → 用既有 CLI 路径落库 → 写回终态」 |
| 关联 Lead 裁定 | L-R25-1（复用既有范式：`scripts/lib/intents.mjs` 词表，D36 含 `running`） |
| 状态 | **待裁决**（QA 未修改任何源码） |

## 复现命令与最小步骤

```bash
# 1) 源码：applyPolicyIntent 里没有任何写入 INTENT_STATUS.running 的分支
grep -n "INTENT_STATUS\." scripts/arcblog-economy.mjs
#   221: status: INTENT_STATUS.pending        （入队）
#   334/355: noop   368: applied   379: rejected
#   → 没有 INTENT_STATUS.running

# 2) 运行期：入队一条意图 → apply，观察状态跃迁（QA 本轮实测见 07-worker-apply1.txt）
node scripts/arcblog-economy.mjs policy request --action preset --creator 0.95 --hub 0.03 --protocol 0.02
node scripts/arcblog-economy.mjs policy apply
#   返回的 intents[i].status 直接是 applied/noop；记录里从未出现 running

# 3) 全队列实测：没有任何 running 记录
node scripts/arcblog-economy.mjs policy queue | grep -c '"status": "running"'   # → 0

# 4) 页面图例（同一页 ?page=policy 的队列卡）
#   "pending = queued, not run yet · running = claimed by the worker · …"
node docs/team/test-reports/raw/round-25/qa-r25-queue.mjs queue   # dom.legend=true
```

## 期望

二选一（由 PM/Lead 裁决）：

- (a) 按 REQ 实现：`applyPolicyIntent` 先把记录写成 `running`（`isInFlightStatus` 已支持崩溃后重新拾取），落库后再写终态；或
- (b) 按实现改文档：删掉 REQ §2.1 的「标 `running`」措辞，并把页面图例里的 `running = claimed by the worker` 改为如实描述（例如「`running` = 预留的认领态；本 worker 不写」）。

现状是**实现与 REQ 图例互相矛盾**，且用户读到的图例描述了一个不会发生的状态。

## 实际

- `applyPolicyIntent()`（`scripts/arcblog-economy.mjs:328–388`）的执行路径是 `pending → applied | noop | rejected`，**没有中间写盘**；`runPendingPolicyIntents()` 用 `isInFlightStatus(intent.status)` 选待办，因此 `running` 只在「理论上」可被消费。
- 没有任何代码路径写 `INTENT_STATUS.running`（`scripts/arcblog-economy.mjs` 内 grep 无命中）。全仓库唯一出现 `running` 的地方是词表与页面图例/`intents.mjs`。
- 功能后果：**无**——`apply` 是同步的，崩溃时最坏留下 `pending`，下一轮 `policy apply` 仍会拾取（不会卡住）。所以是 P3 而不是 P1/P2。

## 证据输出

```text
$ grep -n "INTENT_STATUS\.\|isInFlightStatus\|isTerminalStatus" scripts/arcblog-economy.mjs
18:import { INTENT_STATUS, isInFlightStatus, isTerminalStatus, normalizeIntentRecord } from './lib/intents.mjs';
221:    status: INTENT_STATUS.pending,
233:  if (existing && isInFlightStatus(existing.status)) {
334:    next.status = INTENT_STATUS.noop;
355:      next.status = INTENT_STATUS.noop;
368:      next.status = INTENT_STATUS.applied;
379:    next.status = INTENT_STATUS.rejected;
393:  const pending = intents.filter((intent) => isInFlightStatus(intent.status));
# → 全程没有 INTENT_STATUS.running

$ node scripts/arcblog-economy.mjs policy request --action preset --creator 0.95 --hub 0.03 --protocol 0.02
{ "ok": true, "action": "policy-request", … "status": "pending" … }

# 本轮 QA 的真实 apply 输出（docs/team/test-reports/raw/round-25/07-worker-apply1.txt）：
$ node scripts/arcblog-economy.mjs policy apply
{
  "ok": true,
  "action": "policy-apply",
  "applied": 3,
  "intents": [
    { "id": "2026-09-29T03:30:53.378Z", "action": "preset",  "status": "applied", "changed": ["creator","hub","protocol","updatedAt"], … },
    { "id": "2026-09-29T03:30:59.200Z", "action": "adapter", "status": "applied", "changed": ["paymentAdapter","updatedAt"], … },
    { "id": "2026-09-29T03:31:08.739Z", "action": "preset",  "status": "noop",    "changed": [], … }
  ],
  "queueEntryIgnored": 0
}
# 三条待办全部一步到终态；没有任何一条经过 running

$ node scripts/arcblog-economy.mjs policy queue | grep -c '"status": "running"'
0
$ node scripts/arcblog-economy.mjs policy queue | grep -o '"status": "[a-z]*"' | sort | uniq -c
   4 "status": "applied"

图例（页面 DOM，qa-r25-queue.json → steps.queue.dom.legend = true）：
  pending = queued, not run yet · running = claimed by the worker · applied = …
```

退出码：0

## 影响范围

- 受影响角色：阅读该页图例的 admin / 运维；按 REQ 复验该子步骤的验收方
- 受影响链路：文档 + 文案（`?page=policy` 队列卡图例、REQ-032 §2.1）
- 数据后果：无
- 可绕过：不适用

## 疑似文件

> 线索不是结论；QA 未修改。

- `scripts/arcblog-economy.mjs:328–396`（`applyPolicyIntent` / `runPendingPolicyIntents`）
- `.aup/pages/economy/policy.aup` 的 `queue-legend` 文案
- `docs/team/requirements/REQ-032-policy-intent-queue.md` §2.1 A.2（PM 写范围）
