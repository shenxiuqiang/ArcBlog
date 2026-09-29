# BUG-081: `arcblog-chain-worker.mjs` 无参数时默认执行 `run`（隐式链上签名 / 消耗 pending 意图，fail-open）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-081 |
| 严重级 | **P1**（安全 / fail-open：无任何显式子命令即进入「认领并签名」路径；本次 QA 会话已真实消耗掉一条 pending 链意图） |
| 发现轮次 | round-28（批次末统一 QA；**既有行为，非本批次回归**——`main()` 的 `argv[0] ?? 'run'` 在 HEAD 同形） |
| 关联 REQ | 无（范围外 / 既有）；相关红线：批次要求「零链写零资金」、`CLAUDE.md`「链适配器」段 |
| 状态 | 待裁决（若 PM/Lead 认为落入 P0「fail closed 失效」口径，请升级裁决） |

## 复现命令与最小步骤

1. 前置：`arc` 实例 `default`，`node/factories.json` 指向 `ocap` / `beta`；`config/chain-intents/` 里至少有一条 `status: pending` 的记录。
2. **不要**传任何子命令，只跑脚本名（操作者「想看用法」时最自然的输入）。
3. 观察 stdout：脚本执行 `run`（认领 pending 意图并把结果写回记录），而不是打印 Usage。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
node scripts/arcblog-chain-worker.mjs            # 期望：Usage / fail closed；实际：run
echo "exit=$?"
# 对照：显式 help 才是安全的
node scripts/arcblog-chain-worker.mjs --help     # exit 0，打印 Usage（R28 lane M 落地）
```

## 期望

只有显式 `run|watch` 才允许认领/签名链意图（该 CLI 自己的 help 就写着「`run|watch` are the only commands that can sign」）。无子命令时应打印 Usage 并以非零码 fail closed，或至少拒绝执行签名动作——尤其该脚本是**唯一**能把控制台点击签上链的入口（浏览器不能签名）。

## 实际

`const command = argv[0] ?? 'run'`（`scripts/arcblog-chain-worker.mjs`）⇒ 裸调用**默认 `run`**：认领 `config/chain-intents` 里第一条 in-flight 意图、尝试用当前链适配器签名、并把终态写回该记录。

**本次 QA 会话中的真实后果**（如实登记）：QA 在 B⑥ 探针里顺手执行了一次裸调用，控制台输出：

```text
$ node scripts/arcblog-chain-worker.mjs   # 无参数
{
  "ok": true,
  "action": "intent-run",
  "processed": [ … ]
}
exit=0
```

随后 `config/chain-intents/intent-mujkccy6-r1nd.json` 由 `pending` 变为：

```json
{ "status": "rejected",
  "startedAt": "2026-09-29T06:58:50.100Z",
  "finishedAt": "2026-09-29T06:58:55.386Z",
  "error": "RUNTIME_ERROR GraphQLError: Invalid itx: \"variablesList.value\" Invalid length: Expected >=1 but received 0" }
```

**零资金 / 零链写**：该次尝试在链 host 侧被拒（`Invalid itx … Expected >=1 but received 0`），记录里**没有** `result`、没有 tx hash；`node/factories.json` 全文 `txHash|transactionHash` 出现 **0** 次；`config/chain-intents/pending.json` 未被触碰（sha256 `fef80b4f026e7521…`，与前几轮报告记录的前缀一致）。因此红线「零链写零资金」在**事实层面**仍成立，但「那条 pending 意图仍在」在**状态层面**被我这次裸调用改变了（被消耗成 `rejected`）——这是 QA 流程事故，一并登记在此 BUG 下。

## 证据输出

```text
$ node scripts/arcblog-chain-worker.mjs
{
  "ok": true,
  "action": "intent-run",
  "processed": [
    {
…
```

退出码：0（**成功执行了签名/认领路径**，不是用法提示）

```text
$ arc afs exec /blocklets/arcblog/.actions/read --args '{"path":"/instance/app/arcblog/config/chain-intents/intent-mujkccy6-r1nd.json"}' --json
{"id":"intent-mujkccy6-r1nd","action":"acquire","role":"studio","status":"rejected",
 "requestedAt":"2026-09-27T08:35:06.510Z","startedAt":"2026-09-29T06:58:50.100Z",
 "finishedAt":"2026-09-29T06:58:55.386Z",
 "error":"RUNTIME_ERROR GraphQLError: Invalid itx: \"variablesList.value\" Invalid length: Expected >=1 but received 0"}
```

```text
$ arc afs exec … read pending.json | sha256
fef80b4f026e75217149894f8b8de49113205f99bc07f6323019339703497ea6   ← 未被触碰
$ arc afs exec … read node/factories.json | grep -c 'txHash|transactionHash'
0
```

## 影响范围

- 受影响角色：operator（任何在本机敲 `node scripts/arcblog-chain-worker.mjs` 的人）。
- 受影响链路：链适配器（node-NFT acquire/stake/revoke/claim 的签名与 AFS 意图队列）。
- 数据后果：**已写入**（`intent-mujkccy6-r1nd.json` 的 `status/startedAt/finishedAt/error`；属于链意图队列的终态，不是账本/资金记录；无 tx hash、无资金变动）。该记录按设计就是终态可审计，未回滚（QA 无权重写链意图记录）。
- 可绕过：是（总是显式写子命令）；但默认值本身让「忘记子命令」等价于「签名」。

## 疑似文件

- `scripts/arcblog-chain-worker.mjs`（`main()` 的 `const command = argv[0] ?? 'run'`；同文件 help 段宣称 `run|watch` 是唯一签名路径）
- `scripts/lib/cli-flags.mjs`（`FLAG_SYNTAX_NOTE` / help 契约；无「必须显式子命令」约束）

## Lead 收口裁决（2026-09-29，R28 合并点）

**已关闭（fail-closed 修复）**。`scripts/arcblog-chain-worker.mjs` 原先 `const command = argv[0] ?? 'run'` —— 裸调用即认领并改写链意图（QA 探针实测把一条 `pending` 改成 `rejected`；链主机拒绝、**无 tx、无资金**）。
现在改为**显式子命令必需**：

```
$ node scripts/arcblog-chain-worker.mjs
{"ok": false, "code": "VALIDATION", "error": "a command is required (run|watch|enqueue|queue|refresh): an argument-free invocation must not claim or rewrite chain intents. Run --help for usage."}
exit=1
$ node scripts/arcblog-chain-worker.mjs --help   # exit 0，不触发业务
$ arc afs … list config/chain-intents            # rows=6（未被改动）
```

QC 口径：裸调用 exit 1；`run|watch|enqueue|queue|refresh` 与 `--help` 行为不变；链意图条数不变。
**残余**：QA 探针改写的那条 `rejected` 记录**未回滚**（回滚会再次"跑链"，违反零链写），已作为证据留在实例并登记；那条 pending 意图的原始内容见 QA 报告。
