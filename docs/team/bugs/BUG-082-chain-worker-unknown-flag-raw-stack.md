# BUG-082: `arcblog-chain-worker.mjs` 未知 flag/命令 → 裸异常栈 + `RUNTIME_ERROR`（不是统一的 `VALIDATION` JSON，违反 CLI flag 契约）

| 字段 | 值 |
| ---- | -- |
| 编号 | BUG-082 |
| 严重级 | **P2**（错误码/输出面；exit 1 已 fail-closed、未触发业务，因此不阻断；但批次验收标准 B⑥「未知 flag 仍 fail-closed exit 1 + VALIDATION」未达成——若 Lead 按 REQ-029 §3.1 B32-4 的严格口径判为「退出码/错误码错误」，可升级 P1） |
| 发现轮次 | round-28（批次末统一 QA，B⑥） |
| 关联 REQ | REQ-029 §3.1 B32-4（`--help` / 未知 flag 的统一边界）；同族历史：BUG-060（P3，`chain-worker --help` 面，R28 lane M 已修） |
| 状态 | 待裁决 |

## 复现命令与最小步骤

1. 前置：`/Users/shenxiuqiang/workspace/ArcBlog`。
2. 给 7 个曾被点名的 CLI 各传一个未知 flag，比较退出码与错误码。
3. 只有 `arcblog-chain-worker.mjs` 输出裸栈且错误码是 `RUNTIME_ERROR`。

```bash
cd /Users/shenxiuqiang/workspace/ArcBlog
for f in arcblog-chain-worker arcblog-console-nav arcblog-daily-report \
         arcblog-hero-carousel arcblog-query-posts arcblog-rss arcblog-ui-budget; do
  node scripts/$f.mjs --nope >/dev/null 2>/tmp/e; echo "$f exit=$? code=$(grep -o 'VALIDATION' /tmp/e | head -1)"; head -1 /tmp/e
done
```

## 期望

`CLI` flag 契约（`scripts/lib/cli-flags.mjs` 的 `FLAG_SYNTAX_NOTE`，7 个 CLI 的 `--help` 首行都印着它）：
「an unknown flag fails closed (**VALIDATION**, exit 1)」——即统一走 `fail('VALIDATION', …)` 的结构化 JSON（stderr）+ exit 1。

## 实际

`--nope` 被当成**未知命令**进入 `main()` 末尾的 `fail('VALIDATION', …)`；该调用**抛出** `Error`，被顶层 `main().catch(err => fail('RUNTIME_ERROR', err.stack))` 再次抛出且**无人捕获** ⇒ Node 打印裸栈，退出码 1，错误码 `RUNTIME_ERROR`，stderr 无 JSON、无 `VALIDATION`。同批另外 6 个 CLI 全部 exit 1 + `{ "ok": false, "error": { "code": "VALIDATION" … } }`。

## 证据输出

```text
$ node scripts/arcblog-chain-worker.mjs --nope ; echo "exit=$?"
file:///Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/arc.mjs:103
  const err = new Error(message);
              ^
Error: Error: unknown command: --nope (run|watch|enqueue|queue|refresh)
    at fail (file:///Users/shenxiuqiang/workspace/ArcBlog/scripts/lib/arc.mjs:103:15)
    at main (file:///…/scripts/arcblog-chain-worker.mjs:428:3)
…
  code: 'RUNTIME_ERROR'
}
exit=1
```

```text
$ for f in …; do node scripts/$f.mjs --nope …; done
arcblog-chain-worker         exit=1 code=none      stderr1=file:///…/scripts/lib/arc.mjs:103   ← 本 BUG
arcblog-console-nav          exit=1 code=VALIDATION stderr1={
arcblog-daily-report         exit=1 code=VALIDATION stderr1={
arcblog-hero-carousel        exit=1 code=VALIDATION stderr1={
arcblog-query-posts          exit=1 code=VALIDATION stderr1={
arcblog-rss                  exit=1 code=VALIDATION stderr1={
arcblog-ui-budget            exit=1 code=VALIDATION stderr1={
```

退出码：1（7/7）；错误码统一性：**6/7**。

## 影响范围

- 受影响角色：operator / 自动化脚本（按错误码分支的调用方会把「参数写错」误判为运行期故障）。
- 受影响链路：CLI 解析层输出契约；**未触发任何业务动作**（exit 1 且未认领队列）。
- 数据后果：无。
- 可绕过：是（读 stderr 文本判断），但契约要求机器可读的 `VALIDATION`。

## 疑似文件

- `scripts/arcblog-chain-worker.mjs`（`main()` 末尾 `fail('VALIDATION', …)` 与顶层 `main().catch(err => fail('RUNTIME_ERROR', …))` 的组合：catch 里再抛，异常逃逸）
- `scripts/lib/arc.mjs:100-104`（`fail()` 抛错语义）
- `scripts/lib/cli-flags.mjs`（`FLAG_SYNTAX_NOTE` 的统一契约；其余 6 个 CLI 的落地范式可参照）

## Lead 收口裁决（2026-09-29，R28 合并点）

**已关闭**。根因：`fail()` 是 **throw**，而顶层 `main().catch((err) => fail('RUNTIME_ERROR', …))` 在 catch 里**再 throw** → 未捕获拒绝 → 打印裸栈，绕过了仓库的 JSON 错误契约。
顶层已对齐其它 CLI 的写法（`console.error(JSON.stringify({ok:false,code,error})) + process.exit(1)`）：

```
$ node scripts/arcblog-chain-worker.mjs run --nope
{"ok": false, "code": "VALIDATION", "error": "unknown flag: --nope — Flags: --k v and --k=v are equivalent; an unknown flag fails closed (VALIDATION, exit 1)."}
exit=1
```
