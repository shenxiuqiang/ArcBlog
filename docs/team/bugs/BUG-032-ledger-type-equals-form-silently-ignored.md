# BUG-032: `ledger list --type=<v>` 等号形式被静默忽略（exit 0、未过滤），fail-closed 在等号写法上有缺口

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-032 |
| 严重级 | **P3** |
| 发现轮次 | round-14 |
| 关联 REQ | [REQ-017-orders-and-ledger-ui](../requirements/REQ-017-orders-and-ledger-ui.md) §3.7 A6.2（非法值必须 fail-closed）——本条是**写法变体**上的缺口，空格形式已通过 |
| 状态 | 待裁决（round-14F 复测：**仍未修复**，见文末） |

## 复现命令与最小步骤

1. 前置：`arc` 实例 `default`；任意账本状态（本机实测时账本含 16 条）。
2. 分别用**空格形式**与**等号形式**传非法 / 合法取值。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
node scripts/arcblog-economy.mjs ledger list --type payment ; echo "space-invalid exit=$?"   # 期望 exit 1
node scripts/arcblog-economy.mjs ledger list --type=payment; echo "equals-invalid exit=$?"  # 期望 exit 1（实际 0）
node scripts/arcblog-economy.mjs ledger list --type=refund ; echo "equals-valid exit=$?"
```

## 期望

REQ-017 §1.2 的验收含义原文：「`--type` 必须**真被消费**…并**对未知类型 fail-closed**」；A6.2 要求「非允许值 → **exit ≠ 0** + `VALIDATION` + 允许值集合」。`--type=payment` 是同一个参数的同义写法，应同样 fail-closed（或至少不得静默按“未过滤”执行）。

## 实际

`--flag value` 形式 fail-closed（exit 1，`VALIDATION`）；`--flag=value` 形式被 `parseArgs` 当作一个未知键 `type=payment` 整体忽略 → **exit 0 且返回未过滤的完整账本**：

```text
$ node scripts/arcblog-economy.mjs ledger list --type payment
{"ok":false,"code":"VALIDATION","error":"unknown ledger type: payment (use creator_share|hub_share|protocol_fee|refund)"}
exit=1

$ node scripts/arcblog-economy.mjs ledger list --type=payment
{ "ok": true, "path": "…/economy/ledger", "count": 16, "totalCount": 16, "truncated": false, … }
exit=0        ← 未过滤、未报错

$ node scripts/arcblog-economy.mjs ledger list --type=refund
{ "ok": true, "path": "…/economy/ledger", "count": 16, "totalCount": 16, … }
exit=0        ← 合法值也被忽略（仍是全量）
```

根因（静态，逐行）：

```text
$ sed -n '22,40p' scripts/lib/arc.mjs
22: export function parseArgs(argv) {
30:     const key = token.slice(2);          // "--type=refund" → key = "type=refund"
32:     if (!next || next.startsWith('--')) { out[key] = true; continue; }
36:     out[key] = next;
```

即 `=` 形式在**全 CLI**范围内都不被识别（对照：`ledger list --order=x`、`ledger list --limit=1` 同样 exit 0 且不生效），属**既有机制**，非本轮引入；但本轮新增的 `--type` 把「静默忽略未知 flag」从“无害”升级为「非法取值静默放行全量」，与 REQ §1.2 的诚实性目标正面相关，故登记（**范围外/既有机制**，修复方式与归属请 PM/Lead 裁决）。

## 证据输出

```text
$ node scripts/arcblog-economy.mjs ledger list --type=payment ; echo exit=$?
{ "ok": true, "path": "/instance/app/arcblog/economy/ledger", "count": 16, "totalCount": 16,
  "truncated": false, "total": "37", "hint": "", "entries": [ … 16 条 … ] }
exit=0

$ node scripts/arcblog-economy.mjs ledger list --order x --type bogus ; echo exit=$?
{"ok":false,"code":"VALIDATION","error":"unknown ledger type: bogus (use creator_share|hub_share|protocol_fee|refund)"}
exit=1

$ node scripts/arcblog-economy.mjs ledger list --order=x ; echo exit=$?
{ "ok": true, "path": "…/economy/ledger", "count": 0, "totalCount": 0, … }   ← --order 等号形式同样被忽略
exit=0

$ node scripts/arcblog-economy.mjs ledger list --limit=1 ; echo exit=$?        ← --limit 等号形式同样被忽略
{ "ok": true, … "count": 16, … }
exit=0
```

退出码：0（等号形式）/ 1（空格形式）

## 影响范围

- 受影响角色：operator（敲 CLI 的人）、以及照抄页面命令的读者
- 受影响链路：经济 → 账本筛选（CLI）；同时是**全 CLI** 的参数解析行为
- 数据后果：无（只读，多返回了不该返回的条目）
- 可绕过：是（用空格形式 `--type refund`）；但**用户不会知道**自己敲的等号形式被忽略

## 疑似文件

- `scripts/lib/arc.mjs:22-40`（`parseArgs` 不识别 `--key=value`）
- `scripts/arcblog-economy.mjs:469-475`（`commandLedgerList` 的 `--type` 校验只看 `opts.type`）

---

## 复测（round-14F，QA；.gate-lock 下）

```text
$ node scripts/arcblog-economy.mjs ledger list --type=payment >/tmp/r14f/bug032.json ; echo exit=$?
exit=0
$ head -c 200 /tmp/r14f/bug032.json
{ "ok": true, "path": "/instance/app/arcblog/economy/ledger", "count": 14, "totalCount": 14,
  "truncated": false, "total": "49", "hint": "",
  "entries": [ { "id": "econ-test-order-1790578734639:creator_share", … } ] }
```

**结论**：等号形式 **exit 0 且未按 type 过滤**（返回全部 14 条）→ 缺口仍在，**未修复、未在本轮范围**（`scripts/lib/arc.mjs` 的 `parseArgs` 属全 CLI 通用机制）。空格形式的 fail-closed（`payment`/`bogus`/缺值 → exit≠0 + `VALIDATION` + 允许值集合）已由 R15-D 的新测试用例在 `.gate-lock` 下独立跑绿（`test:file economy` 30/30）。
