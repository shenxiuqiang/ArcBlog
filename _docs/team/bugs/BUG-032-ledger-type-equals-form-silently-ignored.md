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

---

## QA Round 22 独立复验（task-93，2026-09-29；**不采信 Dev 自述**）

> 原始输出：`docs/team/test-reports/raw/round-22/02-bug032-static-cli.txt`、`04-bug032-equiv-result.json`、`05-bug032-help-boundary.txt`、`06-cli-migration-table.txt`、`07-npm-test.txt`、`08-targeted-live.txt`。

**结论：已修复（P3 关闭）** —— 等号形式等价、未知 flag fail-closed、`--order/--limit/--all` 语义未变、全 CLI 单一实现，四项均独立复现。

| 判据 | QA 实测（原始命令 → 真实输出） | 结论 |
| --- | --- | --- |
| B32-1 等号 ≡ 空格 | `--type=refund` 与 `--type refund` **逐字节相同**（`byteIdentical:true`）；`--limit=1` ≡ `--limit 1`（count 1 / totalCount 70 / truncated true）；`--order=<id>` ≡ `--order <id>`（count 2 / 无 totalCount） | 通过 |
| B32-2 合法值真被消费 | `--type=refund` → `count 10 / totalCount 10`，`entries[].type` 集合 = `["refund"]`（修前 = 未过滤全量） | 通过 |
| B32-3 非法值两种写法同码 | `--type=payment` 与 `--type payment` → 均 exit 1、均 **stderr** 输出 `{"ok":false,"code":"VALIDATION","error":"unknown ledger type: payment (use creator_share\|hub_share\|protocol_fee\|refund)"}`，逐字节相同 | 通过 |
| B32-4 未知 flag fail-closed | `ledger list --nope` / `arcblog-media.mjs list --nope` / `arcblog-network.mjs hub list --nope` → 三个 CLI 全 exit 1 + `unknown flag: --nope — Flags: --k v and --k=v are equivalent; an unknown flag fails closed (VALIDATION, exit 1).`；`--help` 仍 exit 0（19 个有 help 的 CLI） | 通过（1 个例外见 BUG-060） |
| B32-5 单一实现 | `grep -rn "^function parseArgs" scripts/` → **0 命中（grep_exit=1）**；26 个 CLI 全部调用 `parseCliArgs`（`scripts/lib/cli-flags.mjs`），共享实现 `scripts/lib/arc.mjs:46` | 通过 |
| B32-6 既有语义零变更 | `--limit 1`≡`--limit=1`→count 1；`--all`→count 70 = totalCount 70 / truncated false；`--order <id>`≡`--order=<id>`→count 2；无 flag 默认 = `--limit 20`（count 20 / truncated true，测试内断言 `run(['ledger','list']) === run(['ledger','list','--limit','20'])`） | 通过（绝对计数 42→70 是测试残渣增长，语义未变） |
| B32-7 `--help` 同步 | `arcblog-economy.mjs --help` 首行 = `Flags: --k v and --k=v are equivalent; an unknown flag fails closed (VALIDATION, exit 1).`；**19 个** CLI 输出同一句（`grep -l FLAG_SYNTAX_NOTE scripts/*.mjs` = 19） | 部分通过（4 个既有缺口 → BUG-060） |
| B32-8 定向用例 | `.gate-lock` 下 `npm run test:file -- scripts/arcblog-economy.test.mjs` → **43/43 全绿**（基线 40 → 43，仅追加）；新增断言含：`--k=v` 等价、非法值两写法同码、每个 flag CLI 未知 flag fail-closed、flag 注册表漂移门、`--help` 文案 | 通过 |
| B32-9 门 + 回归 | `arc dsl validate --json` → `issues: []` exit 0；`npm test` → **35/35**；`arcblog-network.test.mjs` **24/24** | 通过 |

**残留（非阻断，登记为 BUG-060）**：`scripts/arcblog-chain-worker.mjs --help` → exit 1 + 裸 `VALIDATION` 栈（HEAD 版本同行为，非本轮回归）；`arcblog-rss.mjs` / `arcblog-query-posts.mjs` / `arcblog-daily-report.mjs` 忽略 `--help` 直接跑业务（exit 0）。
